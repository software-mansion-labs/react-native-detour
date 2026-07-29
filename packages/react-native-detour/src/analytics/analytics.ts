import { setConsent } from "../shared/consent";
import { setAdvertisingId, setTrackingAuthorizationStatus } from "../shared/deviceIdentifiers";
import { setUserId } from "../shared/userIdentity";
import { DetourEventNames } from "./types";
import type { Conversion } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  analyticsEmitter.emit({ kind: "event", eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ kind: "retention", eventName: retentionEventName });
};

export type ConversionParams = Conversion & {
  eventName: string;
};

export const logConversion = ({ eventName, ...conversion }: ConversionParams) => {
  analyticsEmitter.emit({ kind: "conversion", eventName, conversion });
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
