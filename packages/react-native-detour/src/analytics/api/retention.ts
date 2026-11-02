import { Platform } from "react-native";

import { detourFetch } from "../../net/client";

export const sendRetentionEvent = async ({
  apiKey,
  appID,
  deviceId,
  eventName,
  baseUrl,
  userId,
}: {
  apiKey: string;
  appID: string;
  eventName: string;
  deviceId: string;
  baseUrl?: string;
  userId: string | null;
}) => {
  try {
    const response = await detourFetch("analyticsRetention", {
      config: { apiKey, appID, baseUrl },
      body: {
        event_name: eventName,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: deviceId,
        ...(userId !== null && { user_id: userId }),
      },
    });
    if (response === null) return;

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log retention event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging retention event:", error);
  }
};
