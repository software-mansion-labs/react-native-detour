import { Platform } from "react-native";

import { buildApiUrl } from "../../net/endpoints";
import { SDK_HEADER_VALUE } from "../../version";
import type { DetourEvent } from "../types";

export const sendEvent = async ({
  apiKey,
  appID,
  deviceId,
  event,
  baseUrl,
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
  deviceId: string;
  baseUrl?: string;
}) => {
  const url = buildApiUrl("analyticsEvent", baseUrl);
  if (url === null) return;

  try {
    const response = await fetch(url, {
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
        device_id: deviceId,
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
