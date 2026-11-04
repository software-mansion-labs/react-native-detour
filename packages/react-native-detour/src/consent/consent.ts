import type { DetourStorage } from "../links/types";
import { StorageKeys } from "../links/utils/storage";
import { type DetourRequestConfig, detourFetch } from "../net/client";
import { notifyConsentInputsChange } from "./changes";
import { isSdkEnabled } from "./killSwitch";
import { latestSdkConfig } from "./sdkConfig";
import type { ConsentWire, DetourConsent } from "./types";

type Identity = () => Promise<{ deviceId: string; userId: string | null }>;

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
let identity: Identity | null = null;
// undefined: not read from storage yet.
let stored: ConsentWire | null | undefined;
let passedThisLaunch: ConsentWire | null = null;
let beforeConfigure: { consent: ConsentWire; text: string | undefined } | null = null;

const toWire = (consent: DetourConsent): ConsentWire => ({
  purposes: consent.purposes,
  timestamp: (consent.timestamp ?? new Date()).toISOString(),
  ...(consent.consentTextRef !== undefined && { consent_text_ref: consent.consentTextRef }),
  schema_version: consent.schemaVersion ?? latestSdkConfig().schemaVersion,
  ...(consent.region !== undefined && { region: consent.region }),
  ...(consent.source !== undefined && { source: consent.source }),
});

/**
 * Also the `consent_snapshot` of every request. A stored consent is not sent: it is not trusted
 * to grant anything until the app passes it again.
 */
export const getConsentPassedThisLaunch = () => passedThisLaunch;

export const getStoredConsent = async (): Promise<ConsentWire | null> => {
  if (stored !== undefined) return stored;
  if (!storage) return null;
  try {
    const raw = await storage.getItem(StorageKeys.CONSENT_KEY);
    if (stored === undefined) stored = raw ? (JSON.parse(raw) as ConsentWire) : null;
  } catch {
    if (stored === undefined) stored = null;
  }
  return stored;
};

const send = async (consent: ConsentWire, text: string | undefined) => {
  if (!requestConfig || !identity || !(await isSdkEnabled())) return;
  try {
    const { deviceId, userId } = await identity();
    const response = await detourFetch("sdkConsent", {
      config: requestConfig,
      body: {
        device_id: deviceId,
        ...(userId !== null && { user_id: userId }),
        consent,
        ...(text !== undefined && { consent_text: text }),
      },
    });
    if (response !== null && !response.ok) {
      console.warn(`🔗[Detour:CONSENT] sdk/consent send failed: ${response.status}`);
    }
  } catch (error) {
    console.warn("🔗[Detour:CONSENT] sdk/consent send failed:", error);
  }
};

const record = (consent: ConsentWire, text: string | undefined) => {
  passedThisLaunch = consent;
  stored = consent;
  Promise.resolve(storage?.setItem(StorageKeys.CONSENT_KEY, JSON.stringify(consent))).catch(
    (error) => console.warn("🔗[Detour:CONSENT] Failed to save consent:", error),
  );
  notifyConsentInputsChange();
  send(consent, text);
};

/**
 * Passes the user's choice from your consent platform. Call it on every launch once the platform
 * has the choice, not only when it changes: a choice stored on an earlier launch can stop requests
 * for a purpose, but a grant counts only once passed again on this launch. Each call replaces the
 * previous consent; pass every purpose in one call.
 *
 * @param consentText The text the user agreed to, stored once per version on the Detour server.
 */
export const setConsent = (consent: DetourConsent, consentText?: string) => {
  const wire = toWire(consent);
  if (storage) {
    record(wire, consentText);
  } else {
    // Applied at once for this launch; stored and sent once DetourProvider mounts.
    passedThisLaunch = wire;
    beforeConfigure = { consent: wire, text: consentText };
  }
};

export const configureConsent = (
  userStorage: DetourStorage,
  config: DetourRequestConfig,
  getIdentity: Identity,
) => {
  if (storage !== userStorage) stored = undefined;
  storage = userStorage;
  requestConfig = config;
  identity = getIdentity;
  if (beforeConfigure) {
    const { consent, text } = beforeConfigure;
    beforeConfigure = null;
    record(consent, text);
  }
};
