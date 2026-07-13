import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";

const RETENTION_API_URL = "https://godetour.dev/api/analytics/retention";

export const sendRetentionEvent = async ({
  apiKey,
  appID,
  deviceId,
  eventName,
  idfv,
  aaid,
  idfa,
  customerUserId,
  appVersion,
  buildNumber,
}: {
  apiKey: string;
  appID: string;
  eventName: string;
  deviceId: string;
  idfv?: string;
  aaid?: string;
  idfa?: string;
  customerUserId?: string;
  appVersion?: string;
  buildNumber?: string;
}) => {
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
        device_id: deviceId,
        idfv,
        aaid,
        idfa,
        customer_user_id: customerUserId,
        app_version: appVersion,
        build_number: buildNumber,
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log retention event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging retention event:", error);
  }
};
