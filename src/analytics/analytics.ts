import { DetourEventNames } from './types';
import { analyticsEmitter } from './utils/analyticsEmitter';

export const logEvent = (
  eventName: DetourEventNames | `${DetourEventNames}`,
  data: any
) => {
  analyticsEmitter.emit(eventName as DetourEventNames, data);
};

export const DetourAnalytics = {
  logEvent,
};
