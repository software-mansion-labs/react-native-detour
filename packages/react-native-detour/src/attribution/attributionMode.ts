import type { DetourConversion } from "../analytics/types/index";
import { onConsentInputsChange } from "../consent/changes";
import { decideNow, warnIfStoredGrantWaits } from "../consent/consentGate";
import { warnOnceInDev } from "../consent/devWarnings";
import { DetourPurpose } from "../consent/purposes";
import type { GateDecision } from "../consent/types";
import type { SdkPackage } from "../net/types";
import { isStarted, whenStarted } from "../start";
import type {
  DetourAttributionHost,
  DetourAttributionMatchFields,
  DetourAttributionProvider,
  DetourMetaInstallReferrer,
} from "./types";

// PROVISIONAL: the deferred link waits at most 2 s for the attribution fields, then goes without
// them. A Meta app that is not running took up to 0.9 s to answer on a fast phone; a Meta Install
// Referrer that comes later is sent on its own.
export const ATTRIBUTION_FIELDS_TIMEOUT_MS = 2_000;

// PROVISIONAL: the same cap as events waiting for consent, so an app that never passes the choice
// cannot grow the queue without bound.
const MAX_PENDING_CONVERSIONS = 100;

/** The provider of the attribution package, replaced whole with the provider. */
type ProviderState = {
  provider: DetourAttributionProvider;
  hasStarted: boolean;
  started: Promise<void>;
  markStarted: () => void;
  /** Conversions waiting for the start or being passed to the provider. */
  pendingConversions: number;
};

let current: ProviderState | null = null;

const stateFor = (provider: DetourAttributionProvider): ProviderState => {
  let markStarted = () => {};
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  return { provider, hasStarted: false, started, markStarted, pendingConversions: 0 };
};

/** Set by `configureAttribution`: the provider of the attribution package, or null. */
export const setAttributionProvider = (next: DetourAttributionProvider | null) => {
  if (next === (current?.provider ?? null)) return;
  // Conversions kept for the old provider stop waiting; they see it was replaced and are dropped.
  current?.markStarted();
  current = next ? stateFor(next) : null;
};

export const hasAttributionProvider = () => current !== null;

// Never throws: a gate that cannot be read neither sends nor waits.
export const attributionDecision = (): Promise<GateDecision> =>
  decideNow(DetourPurpose.attribution).catch((error) => {
    console.warn("🔗[Detour:ATTRIBUTION] The attribution gate could not be read; dropping:", error);
    return "drop" as const;
  });

/** True while consent to attribution passed on this launch lets requests through. */
export const isAttributionAllowed = async (): Promise<boolean> =>
  (await attributionDecision()) === "send";

/** True while attribution is on and its gate waits for consent. */
export const isWaitingForAttributionConsent = async (): Promise<boolean> =>
  current !== null && (await attributionDecision()) === "wait";

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

/** True when the first deferred link match has to wait for `start()` or for the attribution gate. */
export const shouldWaitBeforeFirstMatch = async () =>
  !isStarted() || (await isWaitingForAttributionConsent());

/** Resolves once the first deferred link match may go: after `start()` and the gate's decision. */
export const whenFirstMatchAllowed = async () => {
  await whenStarted();
  if (await isWaitingForAttributionConsent()) {
    const isStoredGrantWarned = await warnIfStoredGrantWaits(DetourPurpose.attribution);
    if (!isStoredGrantWarned)
      warnOnceInDev(
        "firstMatchWaits",
        "The first deferred link match waits for consent to attribution. Pass it with Detour.setConsent.",
      );
  }
  await whenAttributionDecided();
};

// `DetourProvider` mounts again after a remount or a config change; the provider starts once.
// It starts after the gate decides, so a consent passed after `Detour.start()` still registers
// the install for SKAdNetwork on this launch.
export const startAttribution = (host: DetourAttributionHost) => {
  const state = current;
  if (!state || state.hasStarted) return;
  state.hasStarted = true;
  whenAttributionDecided().then(() => {
    if (current !== state) return;
    try {
      state.provider.didStart(host);
    } catch (error) {
      console.warn("🔗[Detour:ATTRIBUTION] The attribution package failed to start:", error);
    } finally {
      // Also after a failed start, so kept conversions do not wait until the app is closed.
      state.markStarted();
    }
  });
};

/**
 * Runs in the background and never throws, so `logConversion` stays synchronous. A conversion
 * logged before `start()` or while the gate waits is kept until the provider starts, so a purchase
 * made before the consent prompt is answered still counts for SKAdNetwork.
 */
export const forwardConversion = async (conversion: DetourConversion) => {
  const state = current;
  if (!state || state.pendingConversions >= MAX_PENDING_CONVERSIONS) return;
  state.pendingConversions += 1;
  try {
    await state.started;
    if (current !== state || !(await isAttributionAllowed())) return;
    state.provider.didLogConversion(conversion);
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] Conversion not passed to the attribution package:", error);
  } finally {
    state.pendingConversions -= 1;
  }
};

/**
 * The provider's fields for a deferred link request of this package: none for `core`, without a
 * provider, on an error, or with no answer within `ATTRIBUTION_FIELDS_TIMEOUT_MS`. A Meta Install
 * Referrer that comes after the limit goes to `onLateMetaReferrer`.
 */
export const attributionMatchFieldsFor = async (
  sdkPackage: SdkPackage,
  onLateMetaReferrer: (referrer: DetourMetaInstallReferrer) => void,
): Promise<DetourAttributionMatchFields> => {
  const state = current;
  if (sdkPackage !== "mmp" || !state) return {};

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ATTRIBUTION_FIELDS_TIMEOUT_MS);
  });
  const answer = Promise.resolve()
    .then(() => state.provider.matchFields())
    .catch((error): DetourAttributionMatchFields => {
      console.warn("🔗[Detour:ATTRIBUTION] The attribution package failed to answer:", error);
      return {};
    });
  try {
    const fields = await Promise.race([answer, timeout]);
    if (fields !== null) return fields;
  } finally {
    clearTimeout(timer);
  }
  answer.then(({ meta_install_referrer }) => {
    if (meta_install_referrer) onLateMetaReferrer(meta_install_referrer);
  });
  return {};
};
