import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';

const detourNativeIntentHandler = createDetourNativeIntentHandler({
  fallbackPath: '',
  config: {
    API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
    appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
    timeoutMs: 1200,
  },
  mapToRoute: ({ resolvedUrl }) => {
    // Example of a custom mapping function that transforms the resolved URL into an app route.
    // In this case, we cut the deeplink app hash and keep only the path and search params for routing.
    const url = new URL(resolvedUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 1) {
      url.pathname = `/${pathSegments.slice(1).join('/')}`;
    }
    const route = `${url.pathname}${url.search}`;
    return route;
  },
});

export async function redirectSystemPath(args: {
  path: string;
  initial: boolean;
}) {
  const result = await detourNativeIntentHandler(args);
  return result;
}
