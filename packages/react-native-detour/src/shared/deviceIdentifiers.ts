import { Platform } from "react-native";

import * as Application from "expo-application";

import { applyAutoConsent } from "./consent";

// Opt-out sentinel — collides every opted-out device into the same fake AAID.
const AD_ID_OPT_OUT = "00000000-0000-0000-0000-000000000000";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let manualAdvertisingId: string | undefined;

export type AttStatus = "granted" | "denied" | "undetermined" | "unavailable";
const VALID_ATT_STATUSES: AttStatus[] = ["granted", "denied", "undetermined", "unavailable"];

let manualAttStatus: AttStatus | undefined;

type TrackingTransparencyModule = {
  getAdvertisingId?: () => Promise<string | null>;
  requestTrackingPermissionsAsync?: () => Promise<{ status: string }>;
  getTrackingPermissionsAsync?: () => Promise<{ status: string }>;
};

const trackingTransparency = (() => {
  try {
    return require("expo-tracking-transparency") as TrackingTransparencyModule;
  } catch {
    return null;
  }
})();

export const getIdfv = async (): Promise<string | undefined> => {
  if (Platform.OS !== "ios") return undefined;
  try {
    const idfv = await Application.getIosIdForVendorAsync();
    return idfv ?? undefined;
  } catch {
    return undefined;
  }
};

const fetchRawAdvertisingId = async (): Promise<string | null> => {
  if (!trackingTransparency?.getAdvertisingId) return null;
  try {
    return await trackingTransparency.getAdvertisingId();
  } catch {
    return null;
  }
};

const getRawAdvertisingId = async (): Promise<string | undefined> => {
  const id = await fetchRawAdvertisingId();
  if (!id || id === AD_ID_OPT_OUT) return undefined;
  return id;
};

const applyAaidAutoConsent = (rawId: string | null): void => {
  if (!rawId) return;
  applyAutoConsent({ ad: rawId !== AD_ID_OPT_OUT, source: "aaid-optout" });
};

export const getAaid = async (): Promise<string | undefined> => {
  if (Platform.OS !== "android") return undefined;
  if (manualAdvertisingId) return manualAdvertisingId;
  const rawId = await fetchRawAdvertisingId();
  applyAaidAutoConsent(rawId);
  if (!rawId || rawId === AD_ID_OPT_OUT) return undefined;
  return rawId;
};

export const getIdfa = async (): Promise<string | undefined> => {
  if (Platform.OS !== "ios") return undefined;
  if (manualAdvertisingId) return manualAdvertisingId;
  return getRawAdvertisingId();
};

// Apple ties tracking + ad personalization to one ATT prompt, so a determined
// status implies both consent flags. Skips "undetermined" — we don't know yet.
const applyAttAutoConsent = (status: AttStatus): void => {
  if (status !== "granted" && status !== "denied") return;
  applyAutoConsent({ tracking: status === "granted", ad: status === "granted", source: "att" });
};

const getRawAttStatus = async (): Promise<AttStatus> => {
  if (Platform.OS !== "ios" || !trackingTransparency?.getTrackingPermissionsAsync) {
    return "unavailable";
  }
  try {
    const { status } = await trackingTransparency.getTrackingPermissionsAsync();
    return status as AttStatus;
  } catch {
    return "unavailable";
  }
};

// Reads ATT state without showing the system prompt, so att_status is known
// even when shouldRequestTrackingPermission is off.
export const getAttStatus = async (): Promise<AttStatus> => {
  if (manualAttStatus) return manualAttStatus;
  const status = await getRawAttStatus();
  applyAttAutoConsent(status);
  return status;
};

export type DeviceIdentitySignals = {
  idfv?: string;
  aaid?: string;
  idfa?: string;
  attStatus: AttStatus;
};

let cachedSignals: DeviceIdentitySignals | null = null;
let pendingSignalsPromise: Promise<DeviceIdentitySignals> | null = null;
let signalsGeneration = 0;

export const collectDeviceIdentitySignals = async (): Promise<DeviceIdentitySignals> => {
  if (cachedSignals) {
    return cachedSignals;
  }

  if (pendingSignalsPromise) {
    return pendingSignalsPromise;
  }

  const generation = ++signalsGeneration;

  pendingSignalsPromise = (async () => {
    const [idfv, aaid, idfa, attStatus] = await Promise.all([
      getIdfv(),
      getAaid(),
      getIdfa(),
      getAttStatus(),
    ]);
    const signals = { idfv, aaid, idfa, attStatus };
    // Skip the write if a reset happened mid-flight — otherwise this stale
    // result would silently clobber a host override set in the meantime.
    if (generation === signalsGeneration) {
      cachedSignals = signals;
    }
    return signals;
  })();

  try {
    return await pendingSignalsPromise;
  } finally {
    pendingSignalsPromise = null;
  }
};

const resetDeviceIdentitySignalsCache = (): void => {
  cachedSignals = null;
  pendingSignalsPromise = null;
  signalsGeneration++;
};

// Lets the host inject an AAID/IDFA it already collected another way,
// skipping our own native call for the rest of the session.
export const setAdvertisingId = (id: string): void => {
  if (!UUID_PATTERN.test(id)) {
    console.warn(
      `🔗[Detour:INVALID_ARGUMENT] setAdvertisingId("${id}") ignored — expected a UUID-formatted AAID/IDFA.`,
    );
    return;
  }
  manualAdvertisingId = id;
  resetDeviceIdentitySignalsCache();
};
export const requestTrackingPermission = async (): Promise<void> => {
  if (Platform.OS !== "ios" || !trackingTransparency?.requestTrackingPermissionsAsync) return;
  try {
    const { status } = await trackingTransparency.requestTrackingPermissionsAsync();
    applyAttAutoConsent(status as AttStatus);
  } catch {
    // Best-effort — a failed/denied request just leaves idfa undefined downstream.
  } finally {
    resetDeviceIdentitySignalsCache();
  }
};

// Override for hosts whose native ATT module isn't expo-tracking-transparency.
export const setTrackingAuthorizationStatus = (status: AttStatus): void => {
  if (!VALID_ATT_STATUSES.includes(status)) {
    console.warn(
      `🔗[Detour:INVALID_ARGUMENT] setTrackingAuthorizationStatus("${status}") ignored — ` +
        `expected one of: ${VALID_ATT_STATUSES.join(", ")}.`,
    );
    return;
  }
  manualAttStatus = status;
  applyAttAutoConsent(status);
  resetDeviceIdentitySignalsCache();
};
