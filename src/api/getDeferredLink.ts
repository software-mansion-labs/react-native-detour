import { getProbabilisticFingerprint } from '../utils/fingerprint';

const API_URL = 'https://godetour.dev/api/link/match-link';

export const getDeferredLink = async (apiKey: string, appId: string) => {
  const probabilisticFingerprint = await getProbabilisticFingerprint();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-App-ID': appId,
      },
      body: JSON.stringify(probabilisticFingerprint),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch deferred link');
    }

    const data = await response.json();

    return data.link || null;
  } catch (error) {
    console.error('Error fetching deferred link:', error);
    return null;
  }
};
