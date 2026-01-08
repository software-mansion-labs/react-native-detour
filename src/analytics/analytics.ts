import { DetourEventNames } from './types';
import { analyticsEmitter } from './utils/analyticsEmitter';

export const logEvent = (eventName: DetourEventNames, data: any) => {
  analyticsEmitter.emit(eventName, data);
};

export const DetourAnalytics = {
  logEvent,
};
