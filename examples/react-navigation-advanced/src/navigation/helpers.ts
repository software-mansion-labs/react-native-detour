import type { RootStackParamList } from "./index";

export const APP_SCHEME_PREFIX = "detour-react-navigation-advanced://";

// A pending route is a known screen that requires auth. When a deep link arrives and the user
// is not signed in, this is stored until after sign-in so the link is not lost.
export type PendingRoute = {
  name: "Details";
  params?: RootStackParamList["Details"];
};

const normalizePath = (raw: string) => {
  const isUrlLike = raw.includes("://") || raw.startsWith("//");

  if (!isUrlLike) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  try {
    const urlObj = new URL(raw, `${APP_SCHEME_PREFIX}app`);
    const isWebUrl = urlObj.protocol === "http:" || urlObj.protocol === "https:";
    const pathname = isWebUrl ? urlObj.pathname : `/${urlObj.host}${urlObj.pathname}`;
    return `${pathname}${urlObj.search ?? ""}`;
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
};

// Parses an incoming path/URL into a pending Details route, or null if it doesn't match.
// Used for custom scheme links and Detour links that target the Details screen.
export const toPendingDetailsRoute = (
  raw: string,
  extra?: { linkType?: string },
): PendingRoute | null => {
  const path = normalizePath(raw);
  const pathname = path.split("?")[0] || "/";

  if (pathname !== "/details") {
    return null;
  }

  return {
    name: "Details",
    params: { fromDeepLink: "true", ...extra },
  };
};

export const isAppSchemeUrl = (url: string) => url.toLowerCase().startsWith(APP_SCHEME_PREFIX);
