import type { DetourEventNames } from '../types';

type AnalyticsListener = ({
  eventName,
  data,
  isRetention,
}: {
  eventName: string | DetourEventNames;
  data?: any;
  isRetention?: boolean;
}) => void;

let listeners: AnalyticsListener[] = [];

export const analyticsEmitter = {
  subscribe: (listener: AnalyticsListener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  emit: ({
    eventName,
    data,
    isRetention,
  }: {
    eventName: string | DetourEventNames;
    data?: any;
    isRetention?: boolean;
  }) => {
    if (listeners.length === 0) {
      console.warn(
        '🔗[Detour:ANALYTICS_WARNING] DetourAnalytics method called but DetourProvider is not mounted. Event dropped.'
      );
      return;
    }
    listeners.forEach((listener) => listener({ eventName, data, isRetention }));
  },
};
