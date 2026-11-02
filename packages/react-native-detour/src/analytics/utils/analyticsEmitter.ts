import type { AnalyticsRequest } from "../api/send";

type AnalyticsListener = (request: AnalyticsRequest) => void;

let listeners: AnalyticsListener[] = [];

export const analyticsEmitter = {
  subscribe: (listener: AnalyticsListener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  emit: (request: AnalyticsRequest) => {
    if (listeners.length === 0) {
      console.warn(
        "🔗[Detour:ANALYTICS_WARNING] DetourAnalytics method called but DetourProvider is not mounted. Event dropped.",
      );
      return;
    }
    listeners.forEach((listener) => listener(request));
  },
};
