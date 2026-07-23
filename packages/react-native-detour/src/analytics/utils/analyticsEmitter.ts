import type { Conversion, DetourEventNames } from "../types";

export type AnalyticsEmitterPayload = {
  eventName: string | DetourEventNames;
  data?: any;
  isRetention?: boolean;
  conversion?: Conversion;
};

type AnalyticsListener = (payload: AnalyticsEmitterPayload) => void;

let listeners: AnalyticsListener[] = [];

export const analyticsEmitter = {
  subscribe: (listener: AnalyticsListener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  emit: (payload: AnalyticsEmitterPayload) => {
    if (listeners.length === 0) {
      console.warn(
        "🔗[Detour:ANALYTICS_WARNING] DetourAnalytics method called but DetourProvider is not mounted. Event dropped.",
      );
      return;
    }
    listeners.forEach((listener) => listener(payload));
  },
};
