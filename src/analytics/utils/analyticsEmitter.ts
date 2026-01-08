import type { DetourEventNames } from '../types';

type AnalyticsListener = (eventName: DetourEventNames, data?: any) => void;

let listeners: AnalyticsListener[] = [];

export const analyticsEmitter = {
  subscribe: (listener: AnalyticsListener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  emit: (eventName: DetourEventNames, data?: any) => {
    if (listeners.length === 0) {
      console.warn(
        '🔗[Detour:ANALYTICS_WARNING] DetourAnalytics.logEvent called but DetourProvider is not mounted. Event dropped.'
      );
      return;
    }
    listeners.forEach((listener) => listener(eventName, data));
  },
};
