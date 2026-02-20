import { DetourEventNames } from './types';
import { analyticsEmitter } from './utils/analyticsEmitter';

export const logEvent = (
  eventName: DetourEventNames | `${DetourEventNames}`,
  data?: any
) => {
  analyticsEmitter.emit({ eventName, data });
};

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ eventName: retentionEventName, isRetention: true });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
};
