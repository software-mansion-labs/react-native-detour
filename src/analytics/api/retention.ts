import { Platform } from 'react-native';

const RETENTION_API_URL = 'https://godetour.dev/api/analytics/retention';

export const sendRetentionEvent = async ({
  API_KEY,
  appID,
  deviceId,
  eventName,
}: {
  API_KEY: string;
  appID: string;
  eventName: string;
  deviceId: string;
}) => {
  try {
    const response = await fetch(RETENTION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-App-ID': appID,
      },
      body: JSON.stringify({
        event_name: eventName,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: deviceId,
      }),
    });

    if (!response.ok) {
      console.warn(
        `🔗[Detour:ANALYTICS_ERROR] Failed to log retention event: ${response.status}`
      );
    }
  } catch (error) {
    console.error(
      '🔗[Detour:ANALYTICS_ERROR] Network error logging retention event:',
      error
    );
  }
};
