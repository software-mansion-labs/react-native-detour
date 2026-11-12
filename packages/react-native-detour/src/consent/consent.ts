import type { DetourStorage } from "../links/types";
import { StorageKeys } from "../links/utils/storage";
import { detourFetch } from "../net/client";
import type { DetourRequestConfig } from "../net/types";
import { notifyConsentInputsChange } from "./changes";
import { isSdkEnabled } from "./killSwitch";
import { latestSdkConfig } from "./sdkConfig";
import type { ConsentWire, DetourConsent, Identity } from "./types";

type PassedConsent = { consent: DetourConsent; wire: ConsentWire; text: string | undefined };

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
let identity: Identity | null = null;
// undefined: not read from storage yet.
let stored: ConsentWire | null | undefined;
let passedThisLaunch: ConsentWire | null = null;
let beforeConfigure: PassedConsent | null = null;
// One consent is stored and sent at a time, so a quick second call compares with the first.
let recording: Promise<void> = Promise.resolve();

// Every request carries the consent as `consent_snapshot`, and the API rejects a request whose
// snapshot breaks these rules, so a bad consent is dropped before it is applied.
const consentProblem = ({ purposes, timestamp, schemaVersion, ...texts }: DetourConsent) => {
  if (typeof purposes !== "object" || purposes === null || Array.isArray(purposes)) {
    return "purposes must be an object of purpose IDs";
  }
  if (Object.values(purposes).some((granted) => typeof granted !== "boolean")) {
    return "every purposes value must be true or false";
  }
  if (
    timestamp !== undefined &&
    (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime()))
  ) {
    return "timestamp must be a valid Date";
  }
  if (schemaVersion !== undefined && !Number.isInteger(schemaVersion)) {
    return "schemaVersion must be a whole number";
  }
  const notText = Object.entries(texts).find(
    ([, value]) => value !== undefined && typeof value !== "string",
  );
  return notText ? `${notText[0]} must be a string` : null;
};

const toWire = (consent: DetourConsent): ConsentWire => ({
  purposes: consent.purposes,
  timestamp: (consent.timestamp ?? new Date()).toISOString(),
  ...(consent.consentTextRef !== undefined && { consent_text_ref: consent.consentTextRef }),
  schema_version: consent.schemaVersion ?? latestSdkConfig().schemaVersion,
  ...(consent.region !== undefined && { region: consent.region }),
  ...(consent.source !== undefined && { source: consent.source }),
});

// The timestamp is left out: the same choice passed again is not a new decision of the user.
const choiceKey = ({ timestamp: _timestamp, purposes, ...rest }: ConsentWire) =>
  JSON.stringify({
    ...rest,
    purposes: Object.entries(purposes).sort(([a], [b]) => a.localeCompare(b)),
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

// With the device ID: the storage can come back from a backup of another install, and the server
// has the consent only for that install's device ID.
const reportedKey = (consent: ConsentWire, deviceId: string) =>
  JSON.stringify({ deviceId, consent });

const isReported = async (consent: ConsentWire) => {
  if (!identity) return false;
  try {
    const { deviceId } = await identity();
    return (
      (await storage?.getItem(StorageKeys.REPORTED_CONSENT_KEY)) === reportedKey(consent, deviceId)
    );
  } catch {
    return false;
  }
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
    if (response?.ok) {
      await storage?.setItem(StorageKeys.REPORTED_CONSENT_KEY, reportedKey(consent, deviceId));
    } else if (response !== null) {
      console.warn(`🔗[Detour:CONSENT] sdk/consent send failed: ${response.status}`);
    }
  } catch (error) {
    console.warn("🔗[Detour:CONSENT] sdk/consent send failed:", error);
  }
};

// An app passes its choice on every launch. An unchanged one keeps the time the user chose and,
// once the server has it, is not sent again; a send that failed is retried on the next call.
const record = async ({ consent, wire, text }: PassedConsent) => {
  const previous = await getStoredConsent();
  if (consent.timestamp === undefined && previous && choiceKey(previous) === choiceKey(wire)) {
    passedThisLaunch = previous;
    if (!(await isReported(previous))) await send(previous, text);
    return;
  }

  stored = wire;
  try {
    await storage?.setItem(StorageKeys.CONSENT_KEY, JSON.stringify(wire));
  } catch (error) {
    console.warn("🔗[Detour:CONSENT] Failed to save consent:", error);
  }
  await send(wire, text);
};

const enqueue = (passed: PassedConsent) => {
  recording = recording
    .then(() => record(passed))
    .catch((error) => console.warn("🔗[Detour:CONSENT] Failed to record consent:", error));
};

/**
 * Passes the user's choice from your consent platform. Call it on every launch once the platform
 * has the choice, not only when it changes: a choice stored on an earlier launch can stop requests
 * for a purpose, but a grant counts only once passed again on this launch. An unchanged choice is
 * not sent to the server again. Each call replaces the previous consent; pass every purpose in one
 * call.
 *
 * @param consentText The text the user agreed to, stored once per version on the Detour server.
 */
export const setConsent = (consent: DetourConsent, consentText?: string) => {
  const problem = consentProblem(consent);
  if (problem !== null) {
    console.warn(`🔗[Detour:CONSENT] setConsent dropped: ${problem}.`);
    return;
  }
  // The API rejects an empty text, so it counts as no text.
  const passed = { consent, wire: toWire(consent), text: consentText || undefined };
  // Applied at once for this launch; stored and sent once DetourProvider mounts.
  passedThisLaunch = passed.wire;
  notifyConsentInputsChange();
  if (storage) {
    enqueue(passed);
  } else {
    beforeConfigure = passed;
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
    const passed = beforeConfigure;
    beforeConfigure = null;
    enqueue(passed);
  }
};
