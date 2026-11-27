import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";

import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { readInstallReferrer } from "../links/utils/installReferrer";
import { StorageKeys, removeStoredItem } from "../links/utils/storage";
import { detourFetch, isRetryableStatus } from "../net/client";
import type { DetourEndpoint } from "../net/endpoints";
import type { DetourRequestConfig } from "../net/types";
import {
  attributionDecision,
  readMetaInstallReferrerAgain,
  whenAttributionDecided,
} from "./attributionMode";

/** A referrer read: "failed" may answer on a later try, "none" never will. */
export type ReferrerRead<T> = { found: T } | "none" | "failed";

/**
 * The referrers that can come after the deferred link request: the Meta Install Referrer (the Meta
 * apps' process can be frozen for minutes) and the Google Play one (its service can be down).
 */
export type LateReferrer = "meta" | "installReferrer";

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
  installReferrer: {
    label: "install referrer",
    endpoint: "sdkInstallReferrer",
    field: "install_referrer",
    keptKey: StorageKeys.LATE_INSTALL_REFERRER_KEY,
    unreadKey: StorageKeys.UNREAD_INSTALL_REFERRER_KEY,
    readAgain: async () => {
      const read = await readInstallReferrer();
      return typeof read === "object" ? { found: read.found.installReferrer } : read;
    },
  },
};

// The Play one first, so a hung Meta read does not hold it back.
const ORDER: LateReferrer[] = ["installReferrer", "meta"];

type Kept = { body: { device_id: string } & Record<string, unknown>; keptAt: number };
type Unread = { since: number };

// Meta takes an install event up to 7 days old, and the server takes late referrers for as long,
// so a referrer it never took, or one never read, is dropped then.
const MAX_KEPT_MS = 7 * 24 * 60 * 60 * 1000;

// As Adjust retries its referrer requests: only while the app is on the screen, with a growing
// gap, but a few times per visit (about 2 min in all). The next visit or launch starts again.
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000];

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
// Sent from memory once when the storage could not keep it.
const unsaved: Partial<Record<LateReferrer, Kept>> = {};
// A read still running on this launch, so a check does not read the same referrer twice.
const reading: Partial<Record<LateReferrer, boolean>> = {};
// The note of a first read being written, so the note is not removed before it is stored.
const noting: Partial<Record<LateReferrer, Promise<void>>> = {};
// One check at a time, so a remount or a resume does not send the same referrer twice.
let checking: Promise<void> = Promise.resolve();
let resumeSubscription: NativeEventSubscription | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;

const parseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

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

const keep = async (name: LateReferrer, deviceId: string, referrer: unknown): Promise<Kept> => {
  const source = SOURCES[name];
  const kept: Kept = {
    body: { device_id: deviceId, [source.field]: referrer },
    keptAt: Date.now(),
  };
  reading[name] = false;
  if (!storage) return kept;
  try {
    await storage.setItem(source.keptKey, JSON.stringify(kept));
  } catch (error) {
    console.warn(`🔗[Detour:ATTRIBUTION] Failed to keep the late ${source.label}:`, error);
    unsaved[name] = kept;
  }
  await forgetUnread(storage, name);
  return kept;
};

const forgetUnread = async (store: DetourStorage, name: LateReferrer) => {
  await noting[name];
  await removeStoredItem(store, SOURCES[name].unreadKey);
};

const readKept = async (store: DetourStorage, source: Source): Promise<Kept | null> => {
  const raw = await store.getItem(source.keptKey);
  if (!raw) return null;
  const kept = parseJson<Kept>(raw);
  // An unreadable value is dropped too, so it is not read again on every launch.
  if (!kept) await removeStoredItem(store, source.keptKey);
  return kept;
};

/** A referrer whose first read never answered, read now; null when there is none to read. */
const readAgain = async (
  store: DetourStorage,
  name: LateReferrer,
): Promise<{ found: unknown } | "failed" | null> => {
  const source = SOURCES[name];
  if (reading[name]) return null;
  const raw = await store.getItem(source.unreadKey);
  if (!raw) return null;
  const unread = parseJson<Unread>(raw);
  const decision = await attributionDecision();
  if (!unread || Date.now() - unread.since > MAX_KEPT_MS || decision === "drop") {
    await removeStoredItem(store, source.unreadKey);
    return null;
  }
  const pending = decision === "send" ? source.readAgain() : null;
  if (!pending) return null;
  reading[name] = true;
  const read = await pending.finally(() => {
    reading[name] = false;
  });
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
  let kept = unsaved[name] ?? (await readKept(store, source));
  if (!kept) {
    const read = await readAgain(store, name);
    if (read === null) return "settled";
    if (read === "failed") return "again";
    kept = await keep(name, deviceId, read.found);
  }
  const result = await send(config, deviceId, source, kept);
  if (result === "keep") return "again";
  if (result === "done") {
    delete unsaved[name];
    await removeStoredItem(store, source.keptKey);
  }
  return "settled";
};

const scheduleRetry = () => {
  if (retryTimer || AppState.currentState !== "active") return;
  const delay = RETRY_DELAYS_MS[retryCount];
  if (delay === undefined) return;
  retryCount += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    checkLateReferrers();
  }, delay);
};

const checkLateReferrers = () => {
  checking = checking
    .then(async () => {
      if (!storage || !requestConfig) return;
      const deviceId = await getDeviceId(storage);
      let isLeft = false;
      for (const name of ORDER) {
        const outcome = await check(storage, requestConfig, name, deviceId).catch((error) => {
          console.warn(
            `🔗[Detour:ATTRIBUTION] Failed to send the late ${SOURCES[name].label}:`,
            error,
          );
          return "again" as const;
        });
        isLeft ||= outcome === "again";
      }
      if (isLeft) scheduleRetry();
    })
    .catch((error) =>
      console.warn("🔗[Detour:ATTRIBUTION] Failed to send the late referrers:", error),
    );
  return checking;
};

const startVisit = () => {
  retryCount = 0;
  return checkLateReferrers();
};

const onAppStateChange = (state: AppStateStatus) => {
  if (state === "active") {
    startVisit();
  } else if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

/**
 * Set when `DetourProvider` mounts. Referrers kept or left unread on an earlier launch go once
 * the attribution gate decides, since the app passes its consent again after the mount, and again
 * each time the app comes back to the screen: a late answer often comes while the app is in the
 * background, where Android gives it no network.
 */
export const configureLateReferrers = (userStorage: DetourStorage, config: DetourRequestConfig) => {
  storage = userStorage;
  requestConfig = config;
  whenAttributionDecided().then(startVisit);
  resumeSubscription ??= AppState.addEventListener("change", onAppStateChange);
};

/** Before the first read, which may not answer before the app is closed: read it again then. */
export const startFirstRead = (name: LateReferrer): Promise<void> => {
  reading[name] = true;
  const store = storage;
  if (!store) return Promise.resolve();
  const unread: Unread = { since: Date.now() };
  noting[name] = Promise.resolve()
    .then(() => store.setItem(SOURCES[name].unreadKey, JSON.stringify(unread)))
    .catch((error) =>
      console.warn(`🔗[Detour:ATTRIBUTION] Failed to note the ${SOURCES[name].label} read:`, error),
    );
  return noting[name];
};

/**
 * The first read ended and nothing is left to send late: it went with the deferred link request,
 * or there was none. A failed one stays noted, so it is read again later.
 */
export const endFirstRead = async (name: LateReferrer, hasFailed: boolean) => {
  reading[name] = false;
  if (!hasFailed && storage) await forgetUnread(storage, name);
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
  await keep(name, deviceId, referrer);
  await matchEnded;
  await checkLateReferrers();
};
