import { Platform } from "react-native";

import * as Application from "expo-application";

// Android AAID / iOS IDFA opt-out sentinel — never send as-is, it collides
// every opted-out device into the same fake "identifier".
const AD_ID_OPT_OUT = "00000000-0000-0000-0000-000000000000";

type TrackingTransparencyModule = {
  getAdvertisingId?: () => Promise<string | null>;
  requestTrackingPermissionsAsync?: () => Promise<{ granted: boolean }>;
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

const getRawAdvertisingId = async (): Promise<string | undefined> => {
  if (!trackingTransparency?.getAdvertisingId) return undefined;
  try {
    const id = await trackingTransparency.getAdvertisingId();
    if (!id || id === AD_ID_OPT_OUT) return undefined;
    return id;
  } catch {
    return undefined;
  }
};

// Android advertising ID — feeds the backend's deterministic device_uuid.
export const getAaid = async (): Promise<string | undefined> => {
  if (Platform.OS !== "android") return undefined;
  return getRawAdvertisingId();
};

// iOS advertising ID — ad-attribution signal only, does not feed device_uuid (IDFV does).
export const getIdfa = async (): Promise<string | undefined> => {
  if (Platform.OS !== "ios") return undefined;
  return getRawAdvertisingId();
};

export type DeviceIdentitySignals = {
  idfv?: string;
  aaid?: string;
  idfa?: string;
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
    const [idfv, aaid, idfa] = await Promise.all([getIdfv(), getAaid(), getIdfa()]);
    const signals = { idfv, aaid, idfa };
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

// Host-app-opt-in helper: only called when `shouldRequestTrackingPermission`
// is set on the Detour config. On Android/web this is a no-op — the OS
// doesn't gate the advertising ID behind a runtime prompt there.
export const requestTrackingPermission = async (): Promise<void> => {
  if (Platform.OS !== "ios" || !trackingTransparency?.requestTrackingPermissionsAsync) return;
  try {
    await trackingTransparency.requestTrackingPermissionsAsync();
  } catch {
    // Best-effort — a failed/denied request just leaves idfa undefined downstream.
  } finally {
    resetDeviceIdentitySignalsCache();
  }
};
