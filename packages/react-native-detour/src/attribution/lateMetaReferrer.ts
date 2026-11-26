import { AppState, type NativeEventSubscription } from "react-native";

import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { StorageKeys, removeStoredItem } from "../links/utils/storage";
import { detourFetch, isRetryableStatus } from "../net/client";
import type { DetourRequestConfig } from "../net/types";
import { attributionDecision, whenAttributionDecided } from "./attributionMode";
import type { DetourMetaInstallReferrer } from "./types";

type Kept = {
  body: { device_id: string; meta_install_referrer: DetourMetaInstallReferrer };
  keptAt: number;
};

// Meta takes an install event up to 7 days old, so a referrer the server never took is dropped then.
const MAX_KEPT_MS = 7 * 24 * 60 * 60 * 1000;

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
// Sent from memory once when the storage could not keep it.
let unsaved: Kept | null = null;
// One send at a time, so a remount does not send the same referrer twice.
let sending: Promise<void> = Promise.resolve();
let resumeSubscription: NativeEventSubscription | null = null;

// "keep": try again later.
const send = async (config: DetourRequestConfig, deviceId: string, { body, keptAt }: Kept) => {
  if (Date.now() - keptAt > MAX_KEPT_MS) return "done";
  // A storage restored from another install has a new device ID; the referrer is not its own.
  if (deviceId !== body.device_id) return "done";
  const decision = await attributionDecision();
  if (decision !== "send") return decision === "drop" ? "done" : "keep";
  try {
    const response = await detourFetch("sdkMetaInstallReferrer", { config, body });
    if (response === null) return "keep";
    if (response.ok) return "done";
    // 404: the install is not saved yet.
    if (response.status === 404 || isRetryableStatus(response.status)) return "keep";
    console.warn(`🔗[Detour:ATTRIBUTION] meta-install-referrer rejected: ${response.status}`);
    return "done";
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] meta-install-referrer send failed:", error);
    return "keep";
  }
};

const parseKept = (raw: string): Kept | null => {
  try {
    return JSON.parse(raw) as Kept;
  } catch {
    return null;
  }
};

const sendKept = () => {
  sending = sending
    .then(async () => {
      if (!storage || !requestConfig) return;
      const deviceId = await getDeviceId(storage);
      if (unsaved) {
        if ((await send(requestConfig, deviceId, unsaved)) === "done") unsaved = null;
        return;
      }
      const raw = await storage.getItem(StorageKeys.LATE_META_REFERRER_KEY);
      if (!raw) return;
      const kept = parseKept(raw);
      // An unreadable value is dropped too, so it is not read again on every launch.
      if (!kept || (await send(requestConfig, deviceId, kept)) === "done") {
        await removeStoredItem(storage, StorageKeys.LATE_META_REFERRER_KEY);
      }
    })
    .catch((error) =>
      console.warn("🔗[Detour:ATTRIBUTION] Failed to send the late Meta Install Referrer:", error),
    );
  return sending;
};

/**
 * Set when `DetourProvider` mounts. A referrer kept on an earlier launch goes once the attribution
 * gate decides, since the app passes its consent again after the mount. A kept one goes again each
 * time the app comes back to the screen: Facebook can answer minutes after the install, when the
 * app is already in the background and Android gives it no network.
 */
export const configureLateMetaReferrer = (
  userStorage: DetourStorage,
  config: DetourRequestConfig,
) => {
  storage = userStorage;
  requestConfig = config;
  whenAttributionDecided().then(sendKept);
  resumeSubscription ??= AppState.addEventListener("change", (state) => {
    if (state === "active") sendKept();
  });
};

/**
 * Keeps a Meta Install Referrer that came after the limit for the deferred link request, and sends
 * it once that request ended, so the server already has the install. A referrer the server did not
 * take goes again on a later launch.
 */
export const sendLateMetaReferrer = async (
  deviceId: string,
  referrer: DetourMetaInstallReferrer,
  matchEnded: Promise<void>,
) => {
  if (!storage) return;
  const kept: Kept = {
    body: { device_id: deviceId, meta_install_referrer: referrer },
    keptAt: Date.now(),
  };
  try {
    await storage.setItem(StorageKeys.LATE_META_REFERRER_KEY, JSON.stringify(kept));
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] Failed to keep the late Meta Install Referrer:", error);
    unsaved = kept;
  }
  await matchEnded;
  await sendKept();
};
