import { getConsentPassedThisLaunch, getStoredConsent } from "../consent/consent";
import { decide } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import { gateDefault, getSdkConfig } from "../consent/sdkConfig";
import type { AnalyticsRequest } from "./api/send";

type Send = (request: AnalyticsRequest) => Promise<void>;

let send: Send | null = null;
let waitingForConsent: AnalyticsRequest[] = [];

// PROVISIONAL: kept in memory and capped, so a closed gate the app never answers
// cannot grow without bound. The oldest requests (app_open, the session start) are kept.
const MAX_WAITING_FOR_CONSENT = 100;

export const setAnalyticsSender = (sender: Send | null) => {
  send = sender;
  if (!sender) waitingForConsent = [];
};

export const deliverAnalytics = async (request: AnalyticsRequest) => {
  const [config, storedConsent] = await Promise.all([getSdkConfig(), getStoredConsent()]);
  // Read after the awaits, so a consent passed meanwhile decides this request.
  const decision = decide(DetourPurpose.analytics, {
    consentPassedThisLaunch: getConsentPassedThisLaunch(),
    storedConsent,
    gateDefault: gateDefault(config, DetourPurpose.analytics),
  });

  if (decision === "wait") {
    if (waitingForConsent.length < MAX_WAITING_FOR_CONSENT) waitingForConsent.push(request);
    return;
  }
  if (decision === "send") await send?.(request);
};

/** Sends the requests that waited for consent once a new consent or config decides them. */
export const reevaluateWaiting = () => {
  const waiting = waitingForConsent;
  waitingForConsent = [];
  waiting.forEach((request) => deliverAnalytics(request));
};
