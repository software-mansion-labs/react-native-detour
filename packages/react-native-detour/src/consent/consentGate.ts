import { getConsentPassedThisLaunch, getStoredConsent } from "./consent";
import { warnOnceInDev } from "./devWarnings";
import { isSdkEnabled, isSdkEnabledNow } from "./killSwitch";
import { currentSdkConfig, getSdkConfig, gateDefault as serverGateDefault } from "./sdkConfig";
import type { ConsentGateDefault, ConsentWire, GateDecision } from "./types";

// PROVISIONAL: the stricter cold start rule until the legal answer. A consent stored on an
// earlier launch can only block: the user may have withdrawn it in the consent platform since,
// so a grant counts only once the app passes it again on this launch.
/** Decides whether a request for a purpose may leave the device: the kill switch first, then consent. */
export const decide = (
  purpose: string,
  {
    isEnabled,
    consentPassedThisLaunch,
    storedConsent,
    gateDefault,
  }: {
    isEnabled: boolean;
    consentPassedThisLaunch: ConsentWire | null;
    storedConsent: ConsentWire | null;
    gateDefault: ConsentGateDefault;
  },
): GateDecision => {
  if (!isEnabled) return "drop";
  if (consentPassedThisLaunch) {
    return consentPassedThisLaunch.purposes[purpose] === true ? "send" : "drop";
  }
  if (storedConsent && storedConsent.purposes[purpose] !== true) return "drop";
  return gateDefault === "open" ? "send" : "wait";
};

/** `decide` with the current kill switch, consent and server config. */
export const decideNow = async (purpose: string): Promise<GateDecision> => {
  const [, storedConsent, isEnabledWhenRead] = await Promise.all([
    getSdkConfig(),
    getStoredConsent(),
    isSdkEnabled(),
  ]);
  // Read after the awaits, so a consent, config or kill switch change made meanwhile decides the
  // request. A request decided by an older state could wait after the re-check that frees it.
  const decision = decide(purpose, {
    isEnabled: isSdkEnabledNow() ?? isEnabledWhenRead,
    consentPassedThisLaunch: getConsentPassedThisLaunch(),
    storedConsent,
    gateDefault: serverGateDefault(currentSdkConfig(), purpose),
  });
  if (decision === "wait" && storedConsent?.purposes[purpose] === true) {
    warnOnceInDev(
      "storedGrantNotPassed",
      `A consent to ${purpose} from an earlier launch does not count until Detour.setConsent passes it again on this launch.`,
    );
  }
  return decision;
};
