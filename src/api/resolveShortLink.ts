import type { RequiredConfig } from '../types';

const API_URL = 'https://godetour.dev/api/link/resolve-short';

export type ResolveShortLinkResponse = {
  link: string;
  route: string;
  parameters: string;
};

export const resolveShortLink = async ({
  API_KEY,
  appID,
  url,
}: Omit<RequiredConfig, 'storage' | 'shouldUseClipboard'> & {
  url: string;
}): Promise<ResolveShortLinkResponse | null> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-App-ID': appID,
    },
    body: JSON.stringify({ url }),
  });

  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`[${response.status}] ${response.statusText}`);

  return (await response.json()) as ResolveShortLinkResponse;
};
