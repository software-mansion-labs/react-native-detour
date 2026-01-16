export function getRestOfPath(pathname: string) {
  const secondSlashIndex = pathname.indexOf('/', 1);
  if (secondSlashIndex === -1) {
    return '/';
  }

  return pathname.slice(secondSlashIndex);
}

export const isInfrastructureUrl = (url: string) => {
  if (!url) return true;

  // Expo Development
  if (url.includes('expo-development-client')) return true;
  if (url.startsWith('exp://') || url.startsWith('exps://')) return true;

  if (url === 'about:blank') return true;

  return false;
};

/**
 * Reconstructs a route from a custom scheme URL.
 * Example: myapp://somepath/details?id=1 -> /somepath/details?id=1
 */
export function getRouteFromDeepLink(urlObj: URL): string {
  const route = urlObj.host + urlObj.pathname + (urlObj.search ?? '');
  return route.startsWith('/') ? route : `/${route}`;
}
