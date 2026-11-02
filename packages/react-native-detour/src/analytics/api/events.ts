import { Platform } from "react-native";

import { detourFetch } from "../../net/client";
import type { DetourEvent } from "../types";

export const sendEvent = async ({
  apiKey,
  appID,
  deviceId,
  event,
  baseUrl,
  userId,
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
  deviceId: string;
  baseUrl?: string;
  userId: string | null;
}) => {
  try {
    const response = await detourFetch("analyticsEvent", {
      config: { apiKey, appID, baseUrl },
      body: {
        event_name: event.eventName,
        data: event.data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: deviceId,
        ...(userId !== null && { user_id: userId }),
      },
    });
    if (response === null) return;

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
