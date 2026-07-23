import type { DetourStorage } from "../../shared/storage";
import { sendEvent } from "../api/events";
import { sendRetentionEvent } from "../api/retention";
import type { DetourEvent, DetourEventNames } from "../types";
import type { AnalyticsEmitterPayload } from "./analyticsEmitter";
import buildAnalyticsContext from "./buildAnalyticsContext";

export type DispatchAnalyticsEventConfig = {
  apiKey: string;
  appID: string;
  storage: DetourStorage;
};

export const dispatchAnalyticsEvent = async (
  { eventName, data, isRetention, conversion }: AnalyticsEmitterPayload,
  { apiKey, appID, storage }: DispatchAnalyticsEventConfig,
): Promise<void> => {
  try {
    const analyticsContext = await buildAnalyticsContext(storage);

    if (isRetention) {
      await sendRetentionEvent({ apiKey, appID, eventName, ...analyticsContext });
      return;
    }

    const event: DetourEvent = { eventName: eventName as DetourEventNames, data };
    await sendEvent({ apiKey, appID, event, ...analyticsContext, conversion });
  } catch (error) {
    console.error(
      "[Detour:ANALYTICS_ERROR] Analytics disabled due to storage/runtime failure:",
      error,
    );
  }
};
