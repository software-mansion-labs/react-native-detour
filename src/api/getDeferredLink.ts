import { getProbabilisticFingerprint } from '../utils/fingerprint';

const API_URL = 'https://detour-poc.vercel.app/api/link/matchLink';

export const getDeferredLink = async (_apiKey: string) => {
  const probabilisticFingerprint = await getProbabilisticFingerprint();

  // TODO add api key handling

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
