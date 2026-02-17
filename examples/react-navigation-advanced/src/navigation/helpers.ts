import type { PendingRoute } from '../AuthContext';

export const APP_SCHEME_PREFIX = 'detour-react-navigation-advanced://';

const normalizePath = (raw: string) => {
  const isUrlLike = raw.includes('://') || raw.startsWith('//');

  if (!isUrlLike) {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }

  try {
    const urlObj = new URL(raw, `${APP_SCHEME_PREFIX}app`);
    const isWebUrl =
      urlObj.protocol === 'http:' || urlObj.protocol === 'https:';

    const pathname = isWebUrl
      ? urlObj.pathname
      : `/${urlObj.host}${urlObj.pathname}`;

    return `${pathname}${urlObj.search ?? ''}`;
  } catch {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
};

// This helper function demonstrates how to parse incoming paths into pending route information for protected deep links specifically for the Details screen in this example.
// In a real app, this logic would likely be more complex and handle more routes and edge cases.
export const toPendingDetailsRoute = (
  raw: string,
  source: 'detour' | 'linking'
): PendingRoute | null => {
  const path = normalizePath(raw);
  const pathname = path.split('?')[0] || '/';

  if (pathname === '/details') {
    return {
      name: 'Details',
      params: { fromDeepLink: true, source },
    };
  }

  if (!pathname.startsWith('/details/')) {
    return null;
  }

  const encodedId = pathname.replace('/details/', '');
  const id = encodedId ? decodeURIComponent(encodedId) : undefined;

  return {
    name: 'Details',
    params: { id, fromDeepLink: true, source },
  };
};

export const isAppSchemeUrl = (url: string) =>
  url.toLowerCase().startsWith(APP_SCHEME_PREFIX);
