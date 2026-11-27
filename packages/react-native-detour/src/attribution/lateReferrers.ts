import { Platform } from "react-native";

import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { readInstallReferrer } from "../links/utils/installReferrer";
import { StorageKeys, readStoredJson, removeStoredItem } from "../links/utils/storage";
import { detourFetch, isRetryableStatus } from "../net/client";
import type { DetourEndpoint } from "../net/endpoints";
import type { DetourRequestConfig } from "../net/types";
import { resolveWithin } from "../utils/resolveWithin";
import {
  type MetaReadHooks,
  attributionDecision,
  hasAttributionProvider,
  readMetaInstallReferrerAgain,
  whenAttributionDecided,
} from "./attributionMode";
import { type ReferrerRead, isFound, mapFound } from "./referrerRead";
import { createRetryWhileActive } from "./retryWhileActive";

/**
 * The referrers that can come after the deferred link request: the Meta Install Referrer (the Meta
 * apps' process can be frozen for minutes) and the Google Play one (its service can be down).
 */
export type LateReferrer = "meta" | "play";

type Source = {
  label: string;
  endpoint: DetourEndpoint;
  field: string;
  keptKey: StorageKeys;
  unreadKey: StorageKeys;
  /** Null when nothing on this launch can read it. */
  readAgain: () => Promise<ReferrerRead<unknown>> | null;
};

const SOURCES: Record<LateReferrer, Source> = {
  meta: {
    label: "Meta Install Referrer",
    endpoint: "sdkMetaInstallReferrer",
    field: "meta_install_referrer",
    keptKey: StorageKeys.LATE_META_REFERRER_KEY,
    unreadKey: StorageKeys.UNREAD_META_REFERRER_KEY,
    readAgain: readMetaInstallReferrerAgain,
  },
  play: {
    label: "Google Play install referrer",
    endpoint: "sdkInstallReferrer",
    field: "install_referrer",
    keptKey: StorageKeys.LATE_PLAY_REFERRER_KEY,
    unreadKey: StorageKeys.UNREAD_PLAY_REFERRER_KEY,
    readAgain: async () =>
      mapFound(await readInstallReferrer(), (parsed) => parsed.installReferrer),
  },
};

// The Play one first, so a hung Meta read does not hold it back.
const ORDER: LateReferrer[] = ["play", "meta"];

type Kept = { body: { device_id: string } & Record<string, unknown>; keptAt: number };
type Unread = { since: number };

type LaunchState = {
  // Sent from memory once when the storage could not keep it.
  unsaved: Kept | null;
  // So a check does not read the same referrer a second time while a read runs.
  isReading: boolean;
  // So the note of a first read is not removed before it is stored.
  noting: Promise<void>;
};

const launchState: Record<LateReferrer, LaunchState> = {
  meta: { unsaved: null, isReading: false, noting: Promise.resolve() },
  play: { unsaved: null, isReading: false, noting: Promise.resolve() },
};

// Meta takes an install event up to 7 days old, and the server takes late referrers for as long,
// so a referrer it never took, or one never read, is dropped then.
const MAX_KEPT_MS = 7 * 24 * 60 * 60 * 1000;

// Only while the app is on the screen, with a growing gap, and a few times per visit (about 2 min
// in all). The next visit or launch starts again.
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000];

// A frozen Meta app held a query for minutes in a live test. A check waits at most this long, which
// is longer than a Play read with its retries, so the checks queued behind it are not held up.
const READ_AGAIN_LIMIT_MS = 10_000;

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
// One check at a time, so a remount or a resume does not send the same referrer twice.
let checking: Promise<void> = Promise.resolve();

// "keep": try again later; "wait": the attribution gate waits for consent.
const send = async (
  config: DetourRequestConfig,
  deviceId: string,
  source: Source,
  { body, keptAt }: Kept,
): Promise<"done" | "keep" | "wait"> => {
  if (Date.now() - keptAt > MAX_KEPT_MS) return "done";
  // A storage restored from another install has a new device ID; the referrer is not its own.
  if (deviceId !== body.device_id) return "done";
  const decision = await attributionDecision();
  if (decision !== "send") return decision === "drop" ? "done" : "wait";
  try {
    const response = await detourFetch(source.endpoint, { config, body });
    if (response === null) return "keep";
    if (response.ok) return "done";
    // 404: the install is not saved yet.
    if (response.status === 404 || isRetryableStatus(response.status)) return "keep";
    console.warn(`🔗[Detour:ATTRIBUTION] ${source.label} rejected: ${response.status}`);
    return "done";
  } catch (error) {
    console.warn(`🔗[Detour:ATTRIBUTION] ${source.label} send failed:`, error);
    return "keep";
  }
};

const forgetUnread = async (store: DetourStorage, name: LateReferrer) => {
  await launchState[name].noting;
  await removeStoredItem(store, SOURCES[name].unreadKey).catch((error) =>
    console.warn(`🔗[Detour:ATTRIBUTION] Failed to forget the ${SOURCES[name].label} read:`, error),
  );
};

const keep = async (name: LateReferrer, deviceId: string, referrer: unknown): Promise<Kept> => {
  const source = SOURCES[name];
  const kept: Kept = {
    body: { device_id: deviceId, [source.field]: referrer },
    keptAt: Date.now(),
  };
  if (!storage) return kept;
  try {
    await storage.setItem(source.keptKey, JSON.stringify(kept));
  } catch (error) {
    console.warn(`🔗[Detour:ATTRIBUTION] Failed to keep the late ${source.label}:`, error);
    launchState[name].unsaved = kept;
    // The note stays, so a launch that never sent it from memory reads it again.
    return kept;
  }
  await forgetUnread(storage, name);
  return kept;
};

/** A referrer whose first read never answered, read now; null when there is none to read. */
const readAgain = async (
  store: DetourStorage,
  name: LateReferrer,
  deviceId: string,
): Promise<{ found: unknown } | "failed" | null> => {
  const source = SOURCES[name];
  const state = launchState[name];
  if (state.isReading) return null;
  const unread = await readStoredJson<Unread>(store, source.unreadKey);
  if (!unread) return null;
  const decision = await attributionDecision();
  if (Date.now() - unread.since > MAX_KEPT_MS || decision === "drop") {
    await removeStoredItem(store, source.unreadKey);
    return null;
  }
  const pending = decision === "send" ? source.readAgain() : null;
  if (!pending) return null;
  state.isReading = true;
  const settled = pending.finally(() => {
    state.isReading = false;
  });
  const read = await resolveWithin(settled, READ_AGAIN_LIMIT_MS);
  if (read === null) {
    settled.then((late) => answeredLate(name, deviceId, late, Promise.resolve()));
    return "failed";
  }
  if (read === "none") {
    await forgetUnread(store, name);
    return null;
  }
  return read;
};

/** "again": something is left that a retry on this visit may settle. */
const check = async (
  store: DetourStorage,
  config: DetourRequestConfig,
  name: LateReferrer,
  deviceId: string,
): Promise<"settled" | "again"> => {
  const source = SOURCES[name];
  const state = launchState[name];
  let kept = state.unsaved ?? (await readStoredJson<Kept>(store, source.keptKey));
  if (!kept) {
    const read = await readAgain(store, name, deviceId);
    if (read === null) return "settled";
    if (read === "failed") return "again";
    kept = await keep(name, deviceId, read.found);
  }
  const result = await send(config, deviceId, source, kept);
  if (result === "keep") return "again";
  if (result === "done") {
    state.unsaved = null;
    await removeStoredItem(store, source.keptKey);
  }
  return "settled";
};

const checkLateReferrers = () => {
  checking = checking
    .then(async () => {
      if (!storage || !requestConfig) return;
      const deviceId = await getDeviceId(storage);
      let isAnyLeft = false;
      for (const name of ORDER) {
        const outcome = await check(storage, requestConfig, name, deviceId).catch((error) => {
          console.warn(
            `🔗[Detour:ATTRIBUTION] Failed to send the late ${SOURCES[name].label}:`,
            error,
          );
          return "again" as const;
        });
        isAnyLeft ||= outcome === "again";
      }
      if (isAnyLeft) retries.retryLater();
    })
    .catch((error) =>
      console.warn("🔗[Detour:ATTRIBUTION] Failed to send the late referrers:", error),
    );
  return checking;
};

const retries = createRetryWhileActive(RETRY_DELAYS_MS, checkLateReferrers);

/**
 * Set when `DetourProvider` mounts. Referrers kept or left unread on an earlier launch go once
 * the attribution gate decides, since the app passes its consent again after the mount, and again
 * each time the app comes back to the screen: a late answer often comes while the app is in the
 * background, where Android gives it no network.
 */
export const configureLateReferrers = (userStorage: DetourStorage, config: DetourRequestConfig) => {
  storage = userStorage;
  requestConfig = config;
  whenAttributionDecided().then(retries.startVisit);
  retries.listen();
};

// Noted before the read, which may not answer before the app is closed: it is read again then.
const startFirstRead = (name: LateReferrer): Promise<void> => {
  const state = launchState[name];
  state.isReading = true;
  const store = storage;
  if (!store) return Promise.resolve();
  const unread: Unread = { since: Date.now() };
  state.noting = Promise.resolve()
    .then(() => store.setItem(SOURCES[name].unreadKey, JSON.stringify(unread)))
    .catch((error) =>
      console.warn(`🔗[Detour:ATTRIBUTION] Failed to note the ${SOURCES[name].label} read:`, error),
    );
  return state.noting;
};

// Nothing is left to send late: the referrer went with the deferred link request, or there was
// none. A failed read stays noted and is tried again on this visit, so a user who does not come
// back still sends it.
const endFirstRead = async (name: LateReferrer, read: ReferrerRead<unknown>) => {
  launchState[name].isReading = false;
  if (read === "failed") retries.retryLater();
  else if (storage) await forgetUnread(storage, name);
};

/**
 * Keeps a referrer that came after the limit for the deferred link request, and sends it once
 * that request ended, so the server already has the install. One the server did not take goes
 * again later.
 */
export const sendLateReferrer = async (
  name: LateReferrer,
  deviceId: string,
  referrer: unknown,
  matchEnded: Promise<void>,
) => {
  launchState[name].isReading = false;
  await keep(name, deviceId, referrer);
  await matchEnded;
  await checkLateReferrers();
};

// A read that answered after its limit: a referrer is kept and sent, anything else ends the read.
const answeredLate = (
  name: LateReferrer,
  deviceId: string,
  read: ReferrerRead<unknown>,
  matchEnded: Promise<void>,
) =>
  isFound(read)
    ? sendLateReferrer(name, deviceId, read.found, matchEnded)
    : endFirstRead(name, read);

/**
 * The first read of a referrer for the deferred link request. Only the attribution package sends
 * one read later (it feeds Google's and Meta's claims), and only Android has them.
 */
export const trackFirstRead = async <T>(
  name: LateReferrer,
  read: () => Promise<ReferrerRead<T>>,
): Promise<ReferrerRead<T>> => {
  if (Platform.OS !== "android" || !hasAttributionProvider()) return read();
  await startFirstRead(name);
  const result = await read();
  endFirstRead(name, result);
  return result;
};

/** The Meta read of the deferred link request; one that comes after its limit is sent on its own. */
export const lateMetaReadHooks = (deviceId: string, matchEnded: Promise<void>) =>
  ({
    started: () => startFirstRead("meta"),
    answered: (read) => endFirstRead("meta", read),
    answeredLate: (read) => answeredLate("meta", deviceId, read, matchEnded),
  }) satisfies MetaReadHooks;
