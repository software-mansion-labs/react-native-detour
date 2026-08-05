import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";
import type { AnalyticsContext, DetourEvent } from "../types";
import { toMetadataFields } from "../utils/buildAnalyticsContext";

const EVENT_API_URL = "https://godetour.dev/api/analytics/event";

export const sendEvent = async ({
  apiKey,
  appID,
  event,
  ...ctx
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
} & AnalyticsContext) => {
  try {
    const response = await fetch(EVENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({
        event_name: event.eventName,
        data: event.data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: ctx.deviceId,
        metadata: toMetadataFields(ctx),
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
