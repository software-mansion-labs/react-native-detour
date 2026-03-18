import { Platform } from 'react-native';

const RETENTION_API_URL = 'https://godetour.dev/api/analytics/retention';

export const sendRetentionEvent = async ({
  apiKey,
  appID,
  deviceId,
  eventName,
}: {
  apiKey: string;
  appID: string;
  eventName: string;
  deviceId: string;
}) => {
  if (Platform.OS != 'web') {
    try {
      const response = await fetch(RETENTION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
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
  } else {
    console.log('Analytics is disabled for web version.');
  }
};
