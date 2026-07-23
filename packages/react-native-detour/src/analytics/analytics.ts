import { setConsent } from "../shared/consent";
import { setAdvertisingId, setTrackingAuthorizationStatus } from "../shared/deviceIdentifiers";
import { setUserId } from "../shared/userIdentity";
import { DetourEventNames } from "./types";
import type { Conversion } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  analyticsEmitter.emit({ eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ eventName: retentionEventName, isRetention: true });
};

export type ConversionParams = Conversion & {
  eventName?: DetourEventNames | `${DetourEventNames}`;
};

// The SDK has no signal for transaction amount, so revenue reporting always
// needs an explicit host call. Rides the existing event endpoint (events.ts).
export const logConversion = ({
  eventName = DetourEventNames.Purchase,
  ...conversion
}: ConversionParams) => {
  analyticsEmitter.emit({ eventName, conversion });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
  logConversion,
  setUserId,
  setConsent,
  setAdvertisingId,
  setTrackingAuthorizationStatus,
};
