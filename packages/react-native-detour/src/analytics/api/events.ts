import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";
import type { DetourEvent } from "../types";

const EVENT_API_URL = "https://godetour.dev/api/analytics/event";

export const sendEvent = async ({
  apiKey,
  appID,
  deviceId,
  event,
  idfv,
  aaid,
  idfa,
  customerUserId,
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
  deviceId: string;
  idfv?: string;
  aaid?: string;
  idfa?: string;
  customerUserId?: string;
}) => {
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
        device_id: deviceId,
        idfv,
        aaid,
        idfa,
        customer_user_id: customerUserId,
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
