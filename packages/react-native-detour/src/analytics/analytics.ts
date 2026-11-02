import { DetourEventNames } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  analyticsEmitter.emit({ kind: "event", name: eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ kind: "retention", name: retentionEventName });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
};
