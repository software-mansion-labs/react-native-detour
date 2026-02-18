import type { RequiredConfig } from '../types';
import {
  getDeterministicFingerprint,
  getProbabilisticFingerprint,
  type DeterministicFingerprint,
  type ProbabilisticFingerprint,
} from '../utils/fingerprint';
import * as Application from 'expo-application';

const API_URL = 'https://godetour.dev/api/link/match-link';

const sendFingerprint = async ({
  API_KEY,
  appID,
  requestBody,
}: {
  API_KEY: string;
  appID: string;
  requestBody: ProbabilisticFingerprint | DeterministicFingerprint;
}): Promise<Response> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-App-ID': appID,
    },
    body: JSON.stringify(requestBody),
  });

  return response;
};

export const getDeferredLink = async ({
  API_KEY,
  appID,
  shouldUseClipboard,
}: Pick<RequiredConfig, 'API_KEY' | 'appID' | 'shouldUseClipboard'>) => {
  let referrer: string | null = null;
  try {
    referrer = await Application.getInstallReferrerAsync();
  } catch {
    referrer = null;
  }

  const decodedReferrer = decodeURIComponent(referrer ?? '');
  const matchClickId = decodedReferrer.match(/(?:^|&)click_id=([^&]+)/);
  const referrerClickId = matchClickId ? matchClickId[1] : null;

  let response;
  if (referrerClickId?.length) {
    response = await sendFingerprint({
      API_KEY,
      appID,
      requestBody: getDeterministicFingerprint(referrerClickId),
    });
  } else {
    const probabilisticFingerprint =
      await getProbabilisticFingerprint(shouldUseClipboard);

    response = await sendFingerprint({
      API_KEY,
      appID,
      requestBody: probabilisticFingerprint,
    });
  }

  try {
    if (!response.ok) {
      let errorMessage = 'Request failed';

      try {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMessage =
            typeof errorBody.error === 'string'
              ? errorBody.error
              : JSON.stringify(errorBody.error);
        }
      } catch {
        // If the response isn't JSON (e.g., 500 Internal Server Error HTML),
        // fall back to the generic status code message.
      }

      throw new Error(`[${response.status}] ${errorMessage}`);
    }

    const data = await response.json();
    return data.link || null;
  } catch (error) {
    console.error(
      '🔗[Detour:NETWORK_ERROR] Error fetching deferred link:',
      error
    );
    return null;
  }
};
