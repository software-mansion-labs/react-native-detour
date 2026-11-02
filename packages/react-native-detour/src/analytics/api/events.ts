import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";
import type { DetourEvent } from "../types";

const EVENT_API_URL = "https://godetour.dev/api/analytics/event";

// The server's field error for an event name, e.g. the custom event name limit.
function eventNameFieldError(body: unknown): string | null {
  const message = (body as { error?: { fieldErrors?: { event_name?: unknown } } } | null)?.error
    ?.fieldErrors?.event_name;
  return Array.isArray(message) && typeof message[0] === "string" ? message[0] : null;
}

async function describeRefusal(response: Response, eventName: string): Promise<string> {
  if (response.status === 413) {
    return `Event "${eventName}" refused: the request body is too large.`;
  }
  if (response.status === 429) {
    return `Event "${eventName}" refused: rate limit exceeded.`;
  }
  if (response.status === 400) {
    try {
      const fieldError = eventNameFieldError(await response.json());
      if (fieldError) return `Event "${eventName}" refused: ${fieldError}.`;
    } catch {
      // Fall through to the status code.
    }
  }
  return `Failed to log event: ${response.status}`;
}

export const sendEvent = async ({
  apiKey,
  appID,
  deviceId,
  event,
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
  deviceId: string;
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
      }),
    });

    if (!response.ok) {
      console.warn(
        `🔗[Detour:ANALYTICS_ERROR] ${await describeRefusal(response, event.eventName)}`,
      );
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
