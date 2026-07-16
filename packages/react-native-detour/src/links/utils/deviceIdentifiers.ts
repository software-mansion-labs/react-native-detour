import { Platform } from "react-native";

import * as Application from "expo-application";

import { setConsent } from "../../analytics/utils/consent";

// Android AAID / iOS IDFA opt-out sentinel — never send as-is, it collides
// every opted-out device into the same fake "identifier".
const AD_ID_OPT_OUT = "00000000-0000-0000-0000-000000000000";

// Host-supplied override — set via setAdvertisingId() when the host already
// collected the ID through another native module/SDK, so we skip our own
// native call entirely (see getAaid/getIdfa precedence below).
let manualAdvertisingId: string | undefined;

export type AttStatus = "granted" | "denied" | "undetermined" | "unavailable";

// Host-supplied override — set via setTrackingAuthorizationStatus() when the
// host's native ATT module isn't expo-tracking-transparency.
let manualAttStatus: AttStatus | undefined;

type TrackingTransparencyModule = {
  getAdvertisingId?: () => Promise<string | null>;
  requestTrackingPermissionsAsync?: () => Promise<{ status: string }>;
  getTrackingPermissionsAsync?: () => Promise<{ status: string }>;
};

// Metro needs string literal in require() during bundle time (same constraint as deviceInfo.ts)
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

// Android's equivalent of ATT: Google Play Services returns the opt-out
// sentinel when the user enabled "Opt out of Ads Personalization" in device
// settings. `null` means the fetch failed/unavailable, not an
// opt-out.
const applyAaidAutoConsent = (rawId: string | null): void => {
  if (!rawId) return;
  setConsent({ ad: rawId !== AD_ID_OPT_OUT, source: "aaid-optout" });
};

// Android advertising ID — feeds the backend's deterministic device_uuid.
export const getAaid = async (): Promise<string | undefined> => {
  if (Platform.OS !== "android") return undefined;
  if (manualAdvertisingId) return manualAdvertisingId;
  const rawId = await fetchRawAdvertisingId();
  applyAaidAutoConsent(rawId);
  if (!rawId || rawId === AD_ID_OPT_OUT) return undefined;
  return rawId;
};

// iOS advertising ID — ad-attribution signal only, does not feed device_uuid (IDFV does).
export const getIdfa = async (): Promise<string | undefined> => {
  if (Platform.OS !== "ios") return undefined;
  if (manualAdvertisingId) return manualAdvertisingId;
  return getRawAdvertisingId();
};

// ATT is one gate for both tracking and ad personalization on iOS (Apple ties
// them together) — so once we know the status, we know both consent flags
// without asking the host. Only fires for a determined status; "undetermined"
// means we don't know yet, so we don't want to assert a false negative.
const applyAttAutoConsent = (status: AttStatus): void => {
  if (status !== "granted" && status !== "denied") return;
  setConsent({ tracking: status === "granted", ad: status === "granted", source: "att" });
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

// Reads the current ATT permission state without ever showing the system
// prompt (unlike requestTrackingPermission) — so att_status is known even
// when shouldRequestTrackingPermission is off (host prompts some other way).
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

// These identifiers are static for the lifetime of the app session, so we
// resolve them once and reuse the result instead of re-hitting native APIs
// on every fingerprint/event send.
export const collectDeviceIdentitySignals = async (): Promise<DeviceIdentitySignals> => {
  if (cachedSignals) {
    return cachedSignals;
  }

  if (pendingSignalsPromise) {
    return pendingSignalsPromise;
  }

  pendingSignalsPromise = (async () => {
    const [idfv, aaid, idfa, attStatus] = await Promise.all([
      getIdfv(),
      getAaid(),
      getIdfa(),
      getAttStatus(),
    ]);
    const signals = { idfv, aaid, idfa, attStatus };
    cachedSignals = signals;
    return signals;
  })();

  try {
    return await pendingSignalsPromise;
  } finally {
    pendingSignalsPromise = null;
  }
};

// The ATT dialog can resolve well after our first fingerprint/event read the
// (still-empty) advertising ID — drop the cache so the next read reflects the
// user's actual choice instead of being stuck with the pre-permission value.
const resetDeviceIdentitySignalsCache = (): void => {
  cachedSignals = null;
  pendingSignalsPromise = null;
};

// Lets the host inject an IDFA/AAID it already collected another way (its own
// native bridge, another attribution SDK) — skips our native call for the
// rest of the session. Resets the cache so a value collected before this call
// (or the pre-override native fallback) doesn't linger.
export const setAdvertisingId = (id: string): void => {
  manualAdvertisingId = id;
  resetDeviceIdentitySignalsCache();
};

// Host-app-opt-in helper: only called when `shouldRequestTrackingPermission`
// is set on the Detour config. On Android/web this is a no-op — the OS
// doesn't gate the advertising ID behind a runtime prompt there.
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

// Override for hosts whose native ATT module isn't expo-tracking-transparency
// (e.g. a custom native bridge) — same precedence pattern as setAdvertisingId.
export const setTrackingAuthorizationStatus = (status: AttStatus): void => {
  manualAttStatus = status;
  applyAttAutoConsent(status);
  resetDeviceIdentitySignalsCache();
};
