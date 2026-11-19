import { MAX_EVENT_DATA_BYTES, eventNameProblem } from "./const/eventNames";
import type { DetourEventName } from "./types";
import { analyticsEmitter } from "./utils/analyticsEmitter";

/**
 * Logs an analytics event. `eventName` is a `DetourEventNames` value or a custom
 * name matching `^[a-z0-9_]{1,64}$`. Names starting with `af_` or `dt_`, and
 * `opened_via_universal_link`, are reserved. An invalid name is dropped and
 * logged as an error.
 */
export const logEvent = (eventName: DetourEventName, data?: unknown) => {
  const problem = eventNameProblem(eventName);
  if (problem) {
    console.error(`🔗[Detour:ANALYTICS_ERROR] Event "${eventName}" dropped: ${problem}.`);
    return;
  }

  if (__DEV__ && data !== undefined) {
    warnIfDataTooLarge(eventName, data);
  }

  analyticsEmitter.emit({ eventName, data });
};

// Dev-only, so the JSON length is a close enough stand-in for the server's byte count.
function warnIfDataTooLarge(eventName: string, data: unknown) {
  let length: number;
  try {
    length = JSON.stringify(data)?.length ?? 0;
  } catch {
    return; // Not serializable; sending it will log the error.
  }
  if (length > MAX_EVENT_DATA_BYTES) {
    console.warn(
      `🔗[Detour:ANALYTICS_WARNING] Event "${eventName}" has ${length} characters of data as JSON. ` +
        `Detour stores at most ${MAX_EVENT_DATA_BYTES} bytes of data per event and may refuse larger events.`,
    );
  }
}

export const logRetention = (retentionEventName: string) => {
  analyticsEmitter.emit({ eventName: retentionEventName, isRetention: true });
};

export const DetourAnalytics = {
  logEvent,
  logRetention,
};
