import { AppState } from "react-native";

import { onConsentInputsChange } from "../consent/changes";
import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { checkIsFirstEntrance } from "../links/utils/appEntrance";
import { StorageKeys } from "../links/utils/storage";
import { detourFetch, isRetryableStatus } from "../net/client";
import { getRequestContext } from "../net/requestContext";
import type { DetourRequestConfig } from "../net/types";
import { isStarted, whenStarted } from "../start";
import { deviceIdentifiersFor } from "./attributionMode";
import { isFirstMatchRunning, onFirstMatchEnd } from "./firstMatch";
import { sdkPackageForRequest } from "./sdkPackage";
import type { DetourAdvertisingId } from "./types";

/** The identifiers the SDK may send now, after the consent gate and the provider's own checks. */
export type DeviceIdentifiers = { advertising_id?: DetourAdvertisingId; idfv?: string };

type Hashes = Record<string, string>;
// Holds hashes, not the identifiers, and the device ID they were sent for: a storage restored
// from another install has a new device ID, so that install sends them again.
type Sent = { device_id: string; hashes: Hashes };

// Not for security: it only shows a change without keeping a copy of the identifier (cyrb53).
/* eslint-disable no-bitwise */
const hash = (text: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
/* eslint-enable no-bitwise */

/** The fields to send (a value, or null to clear one sent before) and the hashes to store once the server answered. */
export const identifierChanges = (current: DeviceIdentifiers, sentHashes: Hashes) => {
  const fields: Record<string, unknown> = {};
  const hashes: Hashes = {};
  for (const [name, value] of Object.entries(current)) {
    if (value === undefined) continue;
    hashes[name] = hash(JSON.stringify(value));
    if (sentHashes[name] !== hashes[name]) fields[name] = value;
  }
  for (const name of Object.keys(sentHashes)) {
    if (!(name in hashes)) fields[name] = null;
  }
  return { fields, hashes };
};

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
// One request at a time; a sync asked for meanwhile runs after it with fresh values.
let syncing: Promise<void> = Promise.resolve();
// The listeners live as long as the app; a remount only replaces the storage and the config.
let isSubscribed = false;

const loadSentHashes = async (deviceId: string): Promise<Hashes> => {
  const raw = await storage?.getItem(StorageKeys.SENT_DEVICE_IDENTIFIERS_KEY);
  if (!raw) return {};
  try {
    const sent = JSON.parse(raw) as Sent;
    return sent.device_id === deviceId ? sent.hashes : {};
  } catch {
    return {};
  }
};

// After the first match, so the server has the install to attach them to; only as mmp, because
// the server keeps nothing from core. With the SDK off the package is core too.
const syncOnce = async () => {
  if (!storage || !requestConfig || !isStarted() || isFirstMatchRunning()) return;
  if (await checkIsFirstEntrance(storage)) return;
  const sdkPackage = await sdkPackageForRequest();
  if (sdkPackage !== "mmp") return;
  const deviceId = await getDeviceId(storage);
  const { fields, hashes } = identifierChanges(
    await deviceIdentifiersFor(sdkPackage),
    await loadSentHashes(deviceId),
  );
  if (Object.keys(fields).length === 0) return;

  const response = await detourFetch("sdkDeviceIdentifiers", {
    config: requestConfig,
    body: { ...(await getRequestContext()), ...fields, device_id: deviceId },
    headers: { "X-SDK-Package": sdkPackage },
  }).catch(() => null);
  if (!response || isRetryableStatus(response.status)) return;
  if (!response.ok) {
    // The server will not take this state, so it waits until the state changes. A 404 too: this
    // is sent only after the first match, so an install the server lacks will not come.
    console.warn(`🔗[Detour:ATTRIBUTION] sdk/device-identifiers rejected: ${response.status}`);
  }
  const sent: Sent = { device_id: deviceId, hashes };
  await storage.setItem(StorageKeys.SENT_DEVICE_IDENTIFIERS_KEY, JSON.stringify(sent));
};

/** The identifier fields of a request body, without its other attribution fields. */
// Every field of DeviceIdentifiers: the compiler fails here when one is added to the type only.
const IDENTIFIER_FIELDS = { advertising_id: true, idfv: true } satisfies Record<
  keyof DeviceIdentifiers,
  true
>;

const identifiersIn = (fields: DeviceIdentifiers): DeviceIdentifiers =>
  Object.fromEntries(
    Object.keys(IDENTIFIER_FIELDS)
      .map((name) => [name, fields[name as keyof DeviceIdentifiers]])
      .filter(([, value]) => value !== undefined),
  );

/**
 * Called once the server answered the first match: the identifiers it carried are on the server,
 * so the next sync does not send them again.
 */
export const markSentWithMatch = async (deviceId: string, fields: DeviceIdentifiers) => {
  if (!storage) return;
  const { hashes } = identifierChanges(identifiersIn(fields), {});
  if (Object.keys(hashes).length === 0) return;
  const sent: Sent = {
    device_id: deviceId,
    hashes: { ...(await loadSentHashes(deviceId)), ...hashes },
  };
  await storage.setItem(StorageKeys.SENT_DEVICE_IDENTIFIERS_KEY, JSON.stringify(sent));
};

export const syncDeviceIdentifiers = () => {
  syncing = syncing
    .then(syncOnce)
    .catch((error) =>
      console.warn("🔗[Detour:ATTRIBUTION] Failed to send device identifiers:", error),
    );
  return syncing;
};

/**
 * Set when `DetourProvider` mounts. Sends after the start, after the first match, after a consent
 * change and when the app becomes active, which on iOS also follows the ATT prompt.
 */
export const configureDeviceIdentifiers = (
  userStorage: DetourStorage,
  config: DetourRequestConfig,
) => {
  storage = userStorage;
  requestConfig = config;
  if (isSubscribed) return;
  isSubscribed = true;
  onFirstMatchEnd(syncDeviceIdentifiers);
  onConsentInputsChange(syncDeviceIdentifiers);
  AppState.addEventListener("change", (state) => {
    if (state === "active") syncDeviceIdentifiers();
  });
  whenStarted().then(syncDeviceIdentifiers);
};
