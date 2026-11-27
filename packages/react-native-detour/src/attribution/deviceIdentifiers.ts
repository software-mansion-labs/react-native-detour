import { AppState } from "react-native";

import { onConsentInputsChange } from "../consent/changes";
import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import { getSdkConfig, isFeatureOn, isSdkConfigKnown } from "../consent/sdkConfig";
import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { checkIsFirstEntrance } from "../links/utils/appEntrance";
import { StorageKeys } from "../links/utils/storage";
import { detourFetch, isRetryableStatus } from "../net/client";
import { getRequestContext } from "../net/requestContext";
import type { DetourRequestConfig, SdkPackage } from "../net/types";
import { isStarted, whenStarted } from "../start";
import { resolveWithin } from "../utils/resolveWithin";
import { ATTRIBUTION_FIELDS_TIMEOUT_MS, currentAttributionProvider } from "./attributionMode";
import { isFirstMatchRunning, onFirstMatchEnd } from "./firstMatch";
import { sdkPackageForRequest } from "./sdkPackage";
import type { DetourAdvertisingId, DetourAttributionProvider } from "./types";

/** The identifiers the SDK may send now, after the consent gate and the provider's own checks. */
export type DeviceIdentifiers = { advertising_id?: DetourAdvertisingId; idfv?: string };

// null: known to be absent (no consent, the user opted out), so the server clears it.
// undefined: not known now (consent not passed yet on this launch, a failed read), so the server
// keeps what it has.
type IdentifierReads = { [Name in keyof DeviceIdentifiers]?: DeviceIdentifiers[Name] | null };

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

/**
 * The fields to send (a value, or null to clear one sent before) and the hashes to store once the
 * server answered. One not read now keeps its hash, so it is neither sent nor cleared.
 */
export const identifierChanges = (current: IdentifierReads, sentHashes: Hashes) => {
  const fields: Record<string, unknown> = {};
  const hashes: Hashes = {};
  for (const [name, value] of Object.entries(current)) {
    if (value === undefined || value === null) continue;
    hashes[name] = hash(JSON.stringify(value));
    if (sentHashes[name] !== hashes[name]) fields[name] = value;
  }
  for (const [name, sentHash] of Object.entries(sentHashes)) {
    if (name in hashes) continue;
    if ((current as Record<string, unknown>)[name] === null) fields[name] = null;
    else hashes[name] = sentHash;
  }
  return { fields, hashes };
};

const readOrUnknown = async <T>(label: string, read: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await read();
  } catch (error) {
    console.warn(`🔗[Detour:ATTRIBUTION] ${label} unavailable:`, error);
    return undefined;
  }
};

// Only for postbacks to ad networks, so it needs that purpose, not attribution.
const readAdvertisingId = async (provider: DetourAttributionProvider) => {
  if (!provider.advertisingId) return null;
  const decision = await decideNow(DetourPurpose.adNetworkSharing);
  if (decision === "wait") return undefined;
  return decision === "send" ? provider.advertisingId() : null;
};

// PROVISIONAL: the IDFV is read only with consent and a server flag until the legal answer on
// whether it may be read by default; the answer changes the flag, not the SDK.
const READ_IDFV_FLAG = "read_idfv";

// An mmp request already has consent to attribution, which the IDFV needs.
const readIdfv = async (provider: DetourAttributionProvider) => {
  if (!provider.vendorId) return null;
  const config = await getSdkConfig();
  // Before the first sdk/config answer the flag is not known, so what the server has stays.
  if (!isSdkConfigKnown()) return undefined;
  return isFeatureOn(config, READ_IDFV_FLAG) ? provider.vendorId() : null;
};

/** Each identifier on its own, so one failed read leaves the others as they are. */
const readDeviceIdentifiers = async (): Promise<IdentifierReads> => {
  const provider = currentAttributionProvider();
  if (!provider) return {};
  const [advertisingId, idfv] = await Promise.all([
    readOrUnknown("Advertising ID", () => readAdvertisingId(provider)),
    readOrUnknown("IDFV", () => readIdfv(provider)),
  ]);
  return { advertising_id: advertisingId, idfv };
};

/**
 * The identifiers for the deferred link request of this package: those read within
 * `ATTRIBUTION_FIELDS_TIMEOUT_MS`, so a slow read does not drop the provider's fields. One read
 * later goes to sdk/device-identifiers after the match.
 */
export const identifiersForMatch = async (sdkPackage: SdkPackage): Promise<DeviceIdentifiers> => {
  if (sdkPackage !== "mmp") return {};
  const reads = await resolveWithin(readDeviceIdentifiers(), ATTRIBUTION_FIELDS_TIMEOUT_MS);
  return Object.fromEntries(
    Object.entries(reads ?? {}).filter(([, value]) => value !== undefined && value !== null),
  ) as DeviceIdentifiers;
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

const saveSentHashes = async (deviceId: string, hashes: Hashes) => {
  const sent: Sent = { device_id: deviceId, hashes };
  await storage?.setItem(StorageKeys.SENT_DEVICE_IDENTIFIERS_KEY, JSON.stringify(sent));
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
    await readDeviceIdentifiers(),
    await loadSentHashes(deviceId),
  );
  if (Object.keys(fields).length === 0) return;

  const response = await detourFetch("sdkDeviceIdentifiers", {
    config: requestConfig,
    body: { ...(await getRequestContext()), ...fields, device_id: deviceId },
    headers: { "X-SDK-Package": sdkPackage },
  }).catch((error) => {
    console.warn("🔗[Detour:ATTRIBUTION] sdk/device-identifiers send failed:", error);
    return null;
  });
  if (!response || isRetryableStatus(response.status)) return;
  if (!response.ok) {
    // The server will not take this state, so it waits until the state changes. A 404 too: this
    // is sent only after the first match, so an install the server lacks will not come.
    console.warn(`🔗[Detour:ATTRIBUTION] sdk/device-identifiers rejected: ${response.status}`);
  }
  await saveSentHashes(deviceId, hashes);
};

/**
 * Called once the server answered the first match: the identifiers it carried are on the server,
 * so the next sync does not send them again.
 */
export const markSentWithMatch = async (deviceId: string, identifiers: DeviceIdentifiers) => {
  const { hashes } = identifierChanges(identifiers, {});
  if (Object.keys(hashes).length === 0) return;
  await saveSentHashes(deviceId, { ...(await loadSentHashes(deviceId)), ...hashes });
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
