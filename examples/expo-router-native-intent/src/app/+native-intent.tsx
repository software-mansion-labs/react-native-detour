import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

import { detourConfig } from "./_layout";

const detourNativeIntentHandler = createDetourNativeIntentHandler({
  config: detourConfig,
  mapToRoute: ({ resolvedUrl }) => {
    // Example of a custom mapping function that transforms the resolved URL into an app route.
    // In this case, we cut the deeplink app hash and keep only the path and search params for routing.
    const url = new URL(resolvedUrl);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 1) {
      url.pathname = `/${pathSegments.slice(1).join("/")}`;
    }
    const route = `${url.pathname}${url.search}`;
    return route;
  },
});

export async function redirectSystemPath(args: { path: string; initial: boolean }) {
  const result = await detourNativeIntentHandler(args);

  // Scheme URLs bypass Detour (deferred-only mode) — tag them for display purposes
  if (result === args.path) {
    try {
      const url = new URL(args.path);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        const route = `/${url.host}${url.pathname}`;
        const params = new URLSearchParams(url.search);
        params.set("fromDeepLink", "true");
        params.set("linkType", "scheme");
        return `${route}?${params.toString()}`;
      }
    } catch {
      // Not a valid URL, return as-is
    }
  }

  return result;
}
