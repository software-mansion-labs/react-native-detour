import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";
import type { AnalyticsContext } from "../types";
import { toMetadataFields } from "../utils/buildAnalyticsContext";

const RETENTION_API_URL = "https://godetour.dev/api/analytics/retention";

export const sendRetentionEvent = async ({
  apiKey,
  appID,
  eventName,
  ...ctx
}: { apiKey: string; appID: string; eventName: string } & AnalyticsContext) => {
  try {
    const response = await fetch(RETENTION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({
        event_name: eventName,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: ctx.deviceId,
        metadata: toMetadataFields(ctx),
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log retention event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging retention event:", error);
  }
};
