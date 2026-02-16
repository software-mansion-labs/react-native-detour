/**
 * Arguments passed by Expo Router to `redirectSystemPath`.
 */
export type NativeIntentArgs = {
  /**
   * Incoming system path/URL that should be evaluated.
   */
  path: string;
  /**
   * Whether this is the initial URL used to launch the app.
   */
  initial: boolean;
};

/**
 * Function signature compatible with Expo Router native intent handlers.
 */
export type NativeIntentHandler = (
  args: NativeIntentArgs
) => string | Promise<string>;

/**
 * Match context with a parsed URL object.
 */
export type NativeIntentMatchContext = NativeIntentArgs & {
  url: URL;
};

/**
 * Provider matcher definition used to determine whether an incoming URL should
 * be handled by the Detour native intent helper.
 */
export type NativeIntentProvider = {
  /**
   * Provider identifier useful for diagnostics.
   */
  id: string;
  /**
   * Host patterns to match against `url.hostname`.
   *
   * String examples:
   * - `go.example.com` (exact match)
   * - `*.example.com` (suffix wildcard)
   */
  hosts?: Array<string | RegExp>;
  /**
   * Optional custom matcher.
   * If it returns `true`, the provider is considered matched.
   */
  match?: (context: NativeIntentMatchContext) => boolean;
};

/**
 * Configuration for `createDetourNativeIntentHandler`.
 */
export type NativeIntentOptions = {
  /**
   * Provider matchers evaluated in order.
   * Defaults to a single Detour provider matching `*.godetour.link`.
   */
  providers?: NativeIntentProvider[];
  /**
   * Path returned when a provider match occurs.
   * Defaults to an empty path (`''`), which is commonly used to avoid a
   * temporary not-found flash before app-level Detour handling runs.
   */
  fallbackPath?: string;
  /**
   * Optional callback invoked after a successful match.
   */
  onMatch?: (
    context: NativeIntentMatchContext & { providerId: string }
  ) => void;
};

const DEFAULT_PROVIDER: NativeIntentProvider = {
  id: 'detour',
  hosts: [/\.godetour\.link$/i],
};

const isRegExpMatch = (pattern: RegExp, value: string) => {
  pattern.lastIndex = 0;
  return pattern.test(value);
};

const matchesHost = (hostname: string, hosts: Array<string | RegExp>) => {
  const normalizedHost = hostname.toLowerCase();

  return hosts.some((hostPattern) => {
    if (typeof hostPattern === 'string') {
      const normalizedPattern = hostPattern.toLowerCase();

      if (normalizedPattern.startsWith('*.')) {
        return normalizedHost.endsWith(normalizedPattern.slice(1));
      }

      return normalizedHost === normalizedPattern;
    }

    return isRegExpMatch(hostPattern, normalizedHost);
  });
};

const parseIntentUrl = (path: string): URL | null => {
  try {
    if (path.includes('://')) {
      return new URL(path);
    }

    if (path.startsWith('//')) {
      return new URL(`https:${path}`);
    }

    if (path.startsWith('/')) {
      return null;
    }

    return new URL(`https://${path}`);
  } catch {
    return null;
  }
};

const resolveMatchedProvider = (
  context: NativeIntentMatchContext,
  providers: NativeIntentProvider[]
) => {
  for (const provider of providers) {
    try {
      if (provider.match?.(context)) {
        return provider;
      }
    } catch {
      continue;
    }

    if (!provider.hosts || provider.hosts.length === 0) {
      continue;
    }

    if (matchesHost(context.url.hostname, provider.hosts)) {
      return provider;
    }
  }

  return null;
};

/**
 * Creates a Detour-aware `redirectSystemPath` handler for Expo Router.
 *
 * The returned handler:
 * - parses the incoming path into a URL when possible,
 * - checks configured providers,
 * - returns `fallbackPath` on match,
 * - otherwise returns the original path unchanged.
 *
 * By default, it matches any URL with a hostname ending in `.godetour.link`
 * and returns an empty path on match.
 *
 * @param options Configuration for providers, fallback path, and match callback.
 * @returns A `redirectSystemPath` handler function compatible with Expo Router.
 * @example
 * ```tsx title="app/+native-intent.tsx"
 * import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';
 *
 * export const redirectSystemPath = createDetourNativeIntentHandler({
 *   providers: [{ id: 'detour', hosts: [/\.godetour\.link$/i] }],
 *   fallbackPath: '',
 * });
 * ```
 *
 * @example
 * ```tsx title="app/+native-intent.tsx"
 * import ThirdPartyService from 'third-party-sdk';
 * import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';
 *
 * const detourHandler = createDetourNativeIntentHandler({
 *   providers: [{ id: 'detour', hosts: [/\.godetour\.link$/i] }],
 *   fallbackPath: '',
 * });
 *
 * export async function redirectSystemPath(args: { path: string; initial: boolean }) {
 *   const detourResult = await detourHandler(args);
 *   if (detourResult !== args.path) {
 *     return detourResult;
 *   }
 *
 *   // Your existing third-party/native-intent logic
 *   if (args.initial) {
 *     const url = new URL(args.path, 'myapp://app.home');
 *     if (url.hostname === 'third-party-host') {
 *       return ThirdPartyService.processReferringUrl(url).catch(
 *         () => '/unexpected-error'
 *       );
 *     }
 *   }
 *
 *   return args.path;
 * }
 * ```
 */
export const createDetourNativeIntentHandler = (
  options: NativeIntentOptions = {}
): NativeIntentHandler => {
  const providers = options.providers?.length
    ? options.providers
    : [DEFAULT_PROVIDER];
  const fallbackPath = options.fallbackPath ?? '';

  return ({ path, initial }: NativeIntentArgs) => {
    const url = parseIntentUrl(path);
    if (!url?.hostname) {
      return path;
    }

    const context: NativeIntentMatchContext = { path, initial, url };
    const matchedProvider = resolveMatchedProvider(context, providers);

    if (!matchedProvider) {
      return path;
    }

    options.onMatch?.({
      ...context,
      providerId: matchedProvider.id,
    });

    return fallbackPath;
  };
};
