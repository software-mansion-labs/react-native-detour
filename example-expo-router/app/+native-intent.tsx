// Native intent handler intercepts system URLs before Expo Router processes them.
// For Detour links, we redirect to home and let SDK in RootNavigator handle navigation.
// This provides a unified approach for all link types.
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  console.log('[Native Intent] Processing path:', path, 'initial:', initial);
  try {
    const url = new URL(path.startsWith('http') ? path : `https://${path}`);
    const hostname = url.hostname.toLowerCase();

    // Detour link format - https://<org>.godetour.link/<hash><path>
    // If you have a custom domain, add additional check here for that domain.
    if (hostname.endsWith('.godetour.link')) {
      console.log('[Native Intent] Detour link detected');
      return '';
    }
  } catch (e) {
    console.log('[Native Intent] Not a valid URL. Treating as path:', path);
    // Fallback to original path for non-URL intents (e.g. custom schemes) or malformed URLs
  }

  return path;
}
