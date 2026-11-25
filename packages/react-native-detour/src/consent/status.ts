import { isStarted } from "../start";
import { getConsentPassedThisLaunch } from "./consent";
import { decideNow } from "./consentGate";
import { isSdkEnabled } from "./killSwitch";
import { DetourPurpose } from "./purposes";
import { getSdkConfig } from "./sdkConfig";
import type { GateDecision } from "./types";

// PROVISIONAL: the names until the iOS and Android SDKs ship the same status.
/** What the SDK does now, for debugging a consent integration. */
export type DetourStatus = {
  /** `Detour.start()` was called, or `autoStart` called it. */
  isStarted: boolean;
  /** `false` after `Detour.setEnabled(false)`. */
  isEnabled: boolean;
  /** `Detour.setConsent` was called on this launch. */
  hasConsentThisLaunch: boolean;
  /** Purpose ID → what happens now to a request for it: sent, kept until consent decides, or dropped. */
  purposes: Record<string, GateDecision>;
};

// A state that cannot be read counts as off and dropped, as the requests themselves treat it.
// The warning tells it apart from a real setEnabled(false) or refusal.
const unreadable =
  <T>(fallback: T) =>
  (error: unknown): T => {
    console.warn("🔗[Detour:CONSENT] getStatus could not read the SDK state:", error);
    return fallback;
  };

export const getStatus = async (): Promise<DetourStatus> => {
  const passed = getConsentPassedThisLaunch();
  const config = await getSdkConfig();
  const purposeIDs = new Set([
    ...Object.values(DetourPurpose),
    ...Object.keys(config.consentGateDefaults),
    ...Object.keys(passed?.purposes ?? {}),
  ]);
  const decisions = await Promise.all(
    [...purposeIDs].map(async (purpose) => {
      const decision: GateDecision = await decideNow(purpose).catch(unreadable("drop"));
      return [purpose, decision] as const;
    }),
  );
  return {
    isStarted: isStarted(),
    isEnabled: await isSdkEnabled().catch(unreadable(false)),
    hasConsentThisLaunch: passed !== null,
    purposes: Object.fromEntries(decisions),
  };
};
