export const DEFAULT_BASE_URL = "https://godetour.dev";

export const DETOUR_ENDPOINTS = {
  matchLink: "api/link/match-link",
  resolveShort: "api/link/resolve-short",
  universalLinkClick: "api/link/universal-link-click",
  analyticsEvent: "api/analytics/event",
  analyticsRetention: "api/analytics/retention",
} as const;

export type DetourEndpoint = keyof typeof DETOUR_ENDPOINTS;

const HTTPS_BASE_URL = /^https:\/\/[^\s/?#]+/i;

const reportedBaseUrls = new Set<string>();

const resolveBaseUrl = (baseUrl: string | undefined): string | null => {
  const base = baseUrl ?? DEFAULT_BASE_URL;
  return HTTPS_BASE_URL.test(base) ? base.replace(/\/+$/, "") : null;
};

// PROVISIONAL: an invalid baseUrl blocks requests instead of falling back to production,
// so test traffic never reaches production data.
/** Returns null when `baseUrl` is not an https URL, so no request leaves the device. */
export const buildApiUrl = (endpoint: DetourEndpoint, baseUrl?: string): string | null => {
  const base = resolveBaseUrl(baseUrl);
  return base === null ? null : `${base}/${DETOUR_ENDPOINTS[endpoint]}`;
};

/** Warns once per value at startup when `baseUrl` is set, so a test host does not end up in a production build. */
export const reportBaseUrl = (baseUrl: string | undefined) => {
  if (baseUrl === undefined || baseUrl === DEFAULT_BASE_URL || reportedBaseUrls.has(baseUrl)) {
    return;
  }
  reportedBaseUrls.add(baseUrl);

  if (resolveBaseUrl(baseUrl) !== null) {
    console.warn(
      `🔗[Detour:CONFIG] Using custom baseUrl ${baseUrl}. Remove it before releasing to production.`,
    );
  } else {
    console.error(
      `🔗[Detour:CONFIG] Invalid baseUrl ${baseUrl}: only https URLs are allowed. Requests are not sent.`,
    );
  }
};
