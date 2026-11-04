import type { ConsentGateDefault } from "./sdkConfig";
import type { ConsentWire } from "./types";

/** `wait` keeps the request until the app passes a consent that decides it. */
export type GateDecision = "send" | "wait" | "drop";

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
