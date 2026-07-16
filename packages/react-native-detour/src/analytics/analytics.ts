import { setAdvertisingId, setTrackingAuthorizationStatus } from "../links/utils/deviceIdentifiers";
import { DetourEventNames } from "./types";
import type { Conversion } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";
import { setConsent } from "./utils/consent";
import { setUserId } from "./utils/userIdentity";

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  analyticsEmitter.emit({ eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ eventName: retentionEventName, isRetention: true });
};

export type ConversionParams = Conversion & {
  eventName?: DetourEventNames | `${DetourEventNames}`;
};

// Revenue reporting inherently needs the host to call in — the SDK has no
// signal for transaction amount. Defaults to Purchase since that's the
// overwhelming majority case; still rides the existing event endpoint (see
// events.ts), just with revenue/currency guaranteed as top-level fields.
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
