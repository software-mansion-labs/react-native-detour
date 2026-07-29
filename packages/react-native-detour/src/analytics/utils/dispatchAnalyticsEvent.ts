import type { DetourStorage } from "../../shared/storage";
import { sendConversion } from "../api/conversion";
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
  payload: AnalyticsEmitterPayload,
  { apiKey, appID, storage }: DispatchAnalyticsEventConfig,
): Promise<void> => {
  try {
    const analyticsContext = await buildAnalyticsContext(storage);

    if (payload.kind === "retention") {
      await sendRetentionEvent({
        apiKey,
        appID,
        eventName: payload.eventName,
        ...analyticsContext,
      });
      return;
    }

    if (payload.kind === "conversion") {
      await sendConversion({
        apiKey,
        appID,
        eventName: payload.eventName,
        conversion: payload.conversion,
        ...analyticsContext,
      });
      return;
    }

    const event: DetourEvent = {
      eventName: payload.eventName as DetourEventNames,
      data: payload.data,
    };
    await sendEvent({ apiKey, appID, event, ...analyticsContext });
  } catch (error) {
    console.error(
      "[Detour:ANALYTICS_ERROR] Analytics disabled due to storage/runtime failure:",
      error,
    );
  }
};
