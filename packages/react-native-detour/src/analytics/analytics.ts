import { conversionProblem } from "./conversionCheck";
import type { DetourConversion, DetourEventNames } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

const warnedRevenueEvents = new Set<string>();

export const logEvent = (eventName: DetourEventNames | `${DetourEventNames}`, data?: any) => {
  // Once per name, so a frequent event such as ad_impression does not flood the console.
  if (data?.revenue !== undefined && !warnedRevenueEvents.has(eventName)) {
    warnedRevenueEvents.add(eventName);
    console.warn(
      `🔗[Detour:DEPRECATION] Revenue in logEvent('${eventName}') is not counted as revenue. Use DetourAnalytics.logConversion instead.`,
    );
  }
  analyticsEmitter.emit({ kind: "event", name: eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ kind: "retention", name: retentionEventName });
};

export const logConversion = (conversion: DetourConversion) => {
  const problem = conversionProblem(conversion);
  if (problem !== null) {
    console.warn(`🔗[Detour:ANALYTICS_WARNING] logConversion dropped: ${problem}.`);
    return;
  }
  analyticsEmitter.emit({ kind: "conversion", conversion, at: Date.now() });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
  logConversion,
};
