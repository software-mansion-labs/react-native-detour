import { Platform } from 'react-native';
import type { DetourEvent } from '../types';

const EVENT_API_URL = 'https://godetour.dev/api/analytics/event';

export const sendEvent = async (
  API_KEY: string,
  appID: string,
  event: DetourEvent
) => {
  try {
    const response = await fetch(EVENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-App-ID': appID,
      },
      body: JSON.stringify({
        event_name: event.eventName,
        data: event.data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      console.warn(
        `🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`
      );
    }
  } catch (error) {
    console.error(
      '🔗[Detour:ANALYTICS_ERROR] Network error logging event:',
      error
    );
  }
};
