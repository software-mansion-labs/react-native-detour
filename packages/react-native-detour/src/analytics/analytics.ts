import { type DetourConversion, DetourEventNames } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  if (eventName === DetourEventNames.Purchase && data?.revenue !== undefined) {
    console.warn(
      "🔗[Detour:DEPRECATION] Revenue in logEvent('purchase') is deprecated and not counted as revenue. Use logConversion instead.",
    );
  }
  analyticsEmitter.emit({ kind: "event", name: eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ kind: "retention", name: retentionEventName });
};

export const logConversion = (conversion: DetourConversion) => {
  analyticsEmitter.emit({ kind: "conversion", conversion, at: Date.now() });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
  logConversion,
};
