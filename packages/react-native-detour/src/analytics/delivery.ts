import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import type { AnalyticsRequest } from "./types";

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
  const decision = await decideNow(DetourPurpose.analytics);

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
  waiting.forEach((request) =>
    deliverAnalytics(request).catch((error) =>
      console.error(
        "🔗[Detour:ANALYTICS_ERROR] Failed to send a request that waited for consent:",
        error,
      ),
    ),
  );
};
