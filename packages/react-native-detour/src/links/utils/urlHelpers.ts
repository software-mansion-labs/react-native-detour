const SCHEME_PREFIX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
// Only the path and query of a path-only link are read, so this origin never leaks out.
const PATH_LINK_BASE = "https://x";

export function getRestOfPath(pathname: string) {
  const secondSlashIndex = pathname.indexOf("/", 1);
  if (secondSlashIndex === -1) {
    return "/";
  }

  return pathname.slice(secondSlashIndex);
}

export const isInfrastructureUrl = (url: string) => {
  if (!url) return true;

  // Expo Development
  if (url.includes("expo-development-client")) return true;
  if (url.startsWith("exp://") || url.startsWith("exps://")) return true;

  if (url === "about:blank") return true;

  return false;
};

export const isWebUrl = (rawLink: string, parsedUrl?: URL) => {
  if (rawLink.startsWith("//")) return true;
  if (parsedUrl) {
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  }
  return /^https?:\/\//i.test(rawLink);
};

/**
 * Reconstructs a route from a custom scheme URL.
 * Example: myapp://somepath/details?id=1 -> /somepath/details?id=1
 */
export function getRouteFromDeepLink(urlObj: URL): string {
  const route = urlObj.host + urlObj.pathname + (urlObj.search ?? "");
  return route.startsWith("/") ? route : `/${route}`;
}

/**
 * Tells a full URL from a path-only link (e.g. from the deferred link API).
 * Only a scheme before the first ':' makes it a URL, so "/hash/p?redirect=https://x" stays a path.
 */
export const looksLikeUrl = (rawLink: string) =>
  rawLink.startsWith("//") || SCHEME_PREFIX.test(rawLink);

export const normalizeRawLink = (rawLink: string) =>
  rawLink.startsWith("//") ? `https:${rawLink}` : rawLink;

export function searchParamsToRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

/**
 * Parses a path-only link like "/hash/product/1?x=1#top" and strips the app hash.
 * The fragment is dropped, as it is for full URLs.
 */
export function parsePathLink(rawLink: string) {
  const path = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
  const parsed = new URL(path, PATH_LINK_BASE);
  const pathname = getRestOfPath(parsed.pathname);

  return {
    url: path,
    route: pathname + parsed.search,
    pathname,
    params: searchParamsToRecord(parsed.searchParams),
  };
}
