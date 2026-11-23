import type { DetourConversion } from "../analytics/types/index";
import { onConsentInputsChange } from "../consent/changes";
import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import type { SdkPackage } from "../net/types";
import type {
  DetourAttributionHost,
  DetourAttributionProvider,
  DetourMetaInstallReferrer,
} from "./types";

// PROVISIONAL: the deferred link waits at most 2 s for the attribution fields, then goes without them.
// A Meta app that is not running took up to 0.9 s to answer on a fast phone.
export const ATTRIBUTION_FIELDS_TIMEOUT_MS = 2_000;

// PROVISIONAL: the same cap as events waiting for consent, so an app that never passes the choice
// cannot grow the queue without bound.
const MAX_WAITING_CONVERSIONS = 100;

let provider: DetourAttributionProvider | null = null;
let hasStarted = false;
let markProviderStarted = () => {};
let providerStarted = Promise.resolve();
let waitingConversions = 0;

// Conversions kept for a provider that is replaced stop waiting; the next check drops them.
const resetProviderStarted = () => {
  markProviderStarted();
  providerStarted = new Promise<void>((resolve) => {
    markProviderStarted = resolve;
  });
};

/** Set by `configureAttribution`: the provider of the attribution package, or null. */
export const setAttributionProvider = (next: DetourAttributionProvider | null) => {
  if (next === provider) return;
  provider = next;
  hasStarted = false;
  resetProviderStarted();
};

export const hasAttributionProvider = () => provider !== null;

// It never waits for consent and never fails the caller: a deep link must not be held back,
// so a gate that cannot be read counts as closed.
/** True while consent to attribution passed on this launch lets requests through. */
export const isAttributionAllowed = async (): Promise<boolean> => {
  try {
    return (await decideNow(DetourPurpose.attribution)) === "send";
  } catch {
    return false;
  }
};

/** True while attribution is on and its gate waits for consent. A gate that cannot be read does not wait. */
export const isWaitingForAttributionConsent = async (): Promise<boolean> => {
  if (!provider) return false;
  try {
    return (await decideNow(DetourPurpose.attribution)) === "wait";
  } catch {
    return false;
  }
};

// The backend never attributes an install whose first match went as core, so with attribution
// on that match waits until the gate decides: mmp after a grant, core after a refusal.
/** Resolves once the attribution gate stops waiting. */
export const whenAttributionDecided = () =>
  new Promise<void>((resolve) => {
    const check = async () => {
      if (await isWaitingForAttributionConsent()) return;
      unsubscribe();
      resolve();
    };
    const unsubscribe = onConsentInputsChange(check);
    check();
  });

// `DetourProvider` mounts again after a remount or a config change; the provider starts once.
// It starts after the gate decides, so a consent passed after `Detour.start()` still registers
// the install for SKAdNetwork on this launch.
export const startAttribution = (host: DetourAttributionHost) => {
  const current = provider;
  if (hasStarted || !current) return;
  hasStarted = true;
  const started = markProviderStarted;
  whenAttributionDecided().then(() => {
    if (provider !== current) return;
    current.didStart(host);
    started();
  });
};

/**
 * Runs in the background and never throws, so `logConversion` stays synchronous. A conversion
 * logged before `start()` or while the gate waits is kept until the provider starts, so a purchase
 * made before the consent prompt is answered still counts for SKAdNetwork.
 */
export const forwardConversion = async (conversion: DetourConversion) => {
  const current = provider;
  if (!current || waitingConversions >= MAX_WAITING_CONVERSIONS) return;
  waitingConversions += 1;
  try {
    await providerStarted;
    if (provider !== current || !(await isAttributionAllowed())) return;
    current.didLogConversion(conversion);
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] Conversion not passed to the attribution package:", error);
  } finally {
    waitingConversions -= 1;
  }
};

// A field for a request of this package from the provider: null for `core`, without a provider,
// on an error, or with no answer within `ATTRIBUTION_FIELDS_TIMEOUT_MS`.
const fieldFromProvider = async <T>(
  sdkPackage: SdkPackage,
  ask: (current: DetourAttributionProvider) => Promise<T | null>,
): Promise<T | null> => {
  const current = provider;
  if (sdkPackage !== "mmp" || !current) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ATTRIBUTION_FIELDS_TIMEOUT_MS);
  });
  const answer = Promise.resolve()
    .then(() => ask(current))
    .catch(() => null);
  try {
    return await Promise.race([answer, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/** The provider's Apple Search Ads token for a request of this package. */
export const attributionTokenFor = (sdkPackage: SdkPackage): Promise<string | null> =>
  fieldFromProvider(sdkPackage, (current) => current.attributionToken());

/** The provider's Meta Install Referrer for a request of this package. */
export const metaInstallReferrerFor = (
  sdkPackage: SdkPackage,
): Promise<DetourMetaInstallReferrer | null> =>
  fieldFromProvider(sdkPackage, (current) => current.metaInstallReferrer());
