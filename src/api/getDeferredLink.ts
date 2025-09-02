import type { RequiredConfig } from '../types';
import { getProbabilisticFingerprint } from '../utils/fingerprint';

const API_URL = 'https://detour-poc.vercel.app/api/link/match-link';

export const getDeferredLink = async ({
  API_KEY,
  appID,
  shouldUseClipboard,
}: RequiredConfig) => {
  const probabilisticFingerprint =
    await getProbabilisticFingerprint(shouldUseClipboard);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-App-ID': appID,
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
