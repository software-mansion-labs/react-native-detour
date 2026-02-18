import { resolveShortLink } from '../api/resolveShortLink';
import type { Config } from '../types';
import { getRouteFromDeepLink } from '../utils/urlHelpers';

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
 * Value passed to `mapToRoute` after URL resolution.
 */
export type NativeIntentResolvedValue = {
  /**
   * Original incoming system path passed by Expo Router.
   */
  originalPath: string;
  /**
   * Whether this is the initial URL used to launch the app.
   */
  initial: boolean;
  /**
   * URL after optional short-link resolution.
   */
  resolvedUrl: URL;
};

/**
 * Resolve configuration for `createDetourNativeIntentHandler`.
 */
export type NativeIntentResolveConfig = Pick<Config, 'API_KEY' | 'appID'> & {
  /**
   * Timeout for short-link resolution call.
   * Defaults to `1200` ms.
   */
  timeoutMs?: number;
  /**
   * Optional callback invoked when short-link resolution fails or times out.
   */
  onResolveError?: (error: unknown, context: NativeIntentArgs) => void;
};

/**
 * Configuration for `createDetourNativeIntentHandler`.
 */
export type DetourNativeIntentOptions = {
  /**
   * Path returned when Detour host match occurs and resolve mode is not enabled.
   * Also used as a safe fallback for resolve failures.
   * Defaults to an empty path (`''`), which is commonly used to avoid a
   * temporary not-found flash before app-level Detour handling runs.
   */
  fallbackPath?: string;
  /**
   * Host patterns to match against `url.hostname`.
   *
   * String examples:
   * - `go.example.com` (exact match)
   * - `*.example.com` (suffix wildcard)
   *
   * Defaults to `*.godetour.link`.
   */
  hosts?: Array<string | RegExp>;
  /**
   * When provided, the handler enables resolve mode:
   * - detects short links,
   * - calls resolve-short API when needed,
   * - maps the resulting URL to a final app route.
   *
   * Without this field, the handler works in intercept mode and simply returns
   * `fallbackPath` on host match.
   */
  config?: NativeIntentResolveConfig;
  /**
   * Optional mapping callback used in resolve mode.
   * If omitted, SDK uses the default mapping strategy.
   */
  mapToRoute?: (value: NativeIntentResolvedValue) => string;
};

/**
 * Backward-compatible alias for options type.
 */
export type NativeIntentOptions = DetourNativeIntentOptions;

const DEFAULT_HOSTS: Array<string | RegExp> = [/\.godetour\.link$/i];
const DEFAULT_TIMEOUT_MS = 1200;

const isRegExpMatch = (pattern: RegExp, value: string) => {
  pattern.lastIndex = 0;
  return pattern.test(value);
};

const matchesHostPattern = (hostname: string, hostPattern: string | RegExp) => {
  const normalizedHost = hostname.toLowerCase();

  if (typeof hostPattern === 'string') {
    const normalizedPattern = hostPattern.toLowerCase();

    if (normalizedPattern.startsWith('*.')) {
      return normalizedHost.endsWith(normalizedPattern.slice(1));
    }

    return normalizedHost === normalizedPattern;
  }

  return isRegExpMatch(hostPattern, normalizedHost);
};

const matchesAnyHost = (hostname: string, hosts: Array<string | RegExp>) => {
  return hosts.some((pattern) => matchesHostPattern(hostname, pattern));
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

const isWebProtocol = (url: URL) => {
  return url.protocol === 'http:' || url.protocol === 'https:';
};

const normalizeRoute = (value: string, fallbackPath: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return fallbackPath;
  }

  if (trimmedValue.startsWith('/')) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith('?')) {
    return `/${trimmedValue}`;
  }

  return `/${trimmedValue}`;
};

/**
 * Default mapping strategy used when `mapToRoute` is not provided.
 *
 * Web URL mapping:
 * - single segment path: keep original pathname (e.g. `/details`)
 * - multi segment path: drop the first segment (Detour app-hash segment)
 *   e.g. `/abcd1234/details` -> `/details`
 *
 * Custom scheme mapping:
 * - convert to Expo Router path (`myapp://app/details?id=1` -> `/app/details?id=1`)
 */
const defaultMapToRoute = ({ resolvedUrl }: NativeIntentResolvedValue) => {
  if (!isWebProtocol(resolvedUrl)) {
    return getRouteFromDeepLink(resolvedUrl);
  }

  const pathSegments = resolvedUrl.pathname.split('/').filter(Boolean);

  if (pathSegments.length <= 1) {
    return `${resolvedUrl.pathname || '/'}${resolvedUrl.search ?? ''}`;
  }

  const routeWithoutAppHash = `/${pathSegments.slice(1).join('/')}`;
  return `${routeWithoutAppHash}${resolvedUrl.search ?? ''}`;
};

const isShortLinkCandidate = (url: URL) => {
  if (!isWebProtocol(url)) {
    return false;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  return pathSegments.length === 1 && Boolean(firstSegment?.length);
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Detour short-link resolve timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

/**
 * Creates a Detour-aware `redirectSystemPath` handler for Expo Router.
 *
 * The returned handler:
 * - parses the incoming path into a URL when possible,
 * - checks whether the URL host matches configured Detour hosts,
 * - returns `fallbackPath` on match (intercept mode),
 * - or resolves short links + maps to route (resolve mode),
 * - otherwise returns the original path unchanged.
 *
 * By default, it matches any URL with a hostname ending in `.godetour.link`.
 *
 * @param options Configuration for host matching, fallback path, and optional resolve mode.
 * @returns A `redirectSystemPath` handler function compatible with Expo Router.
 * @example
 * ```tsx title="app/+native-intent.tsx"
 * import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';
 *
 * export const redirectSystemPath = createDetourNativeIntentHandler({
 *   fallbackPath: '',
 * });
 * ```
 *
 * @example
 * ```tsx title="app/+native-intent.tsx"
 * import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';
 *
 * export const redirectSystemPath = createDetourNativeIntentHandler({
 *   fallbackPath: '',
 *   hosts: ['custom.domain.com', /\.example\.org$/i],
 * });
 * ```
 *
 * @example
 * ```tsx title="app/+native-intent.tsx"
 * import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';
 *
 * export const redirectSystemPath = createDetourNativeIntentHandler({
 *   fallbackPath: '',
 *   config: {
 *     API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
 *     appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
 *     timeoutMs: 1200,
 *   },
 *
 *   // Optional custom mapping:
 *   mapToRoute: ({ resolvedUrl }) => `${resolvedUrl.pathname}${resolvedUrl.search}`,
 * });
 * ```
 */
export const createDetourNativeIntentHandler = (
  options: DetourNativeIntentOptions = {}
): NativeIntentHandler => {
  const fallbackPath = options.fallbackPath ?? '';
  const hosts = options.hosts?.length ? options.hosts : DEFAULT_HOSTS;
  const mapToRoute = options.mapToRoute ?? defaultMapToRoute;

  return async ({ path, initial }: NativeIntentArgs) => {
    const url = parseIntentUrl(path);
    if (!url?.hostname) {
      return path;
    }

    if (!matchesAnyHost(url.hostname, hosts)) {
      return path;
    }

    if (!options.config) {
      return fallbackPath;
    }

    let resolvedUrl = url;

    if (isShortLinkCandidate(url)) {
      try {
        const resolved = await withTimeout(
          resolveShortLink({
            API_KEY: options.config.API_KEY,
            appID: options.config.appID,
            url: url.toString(),
          }),
          options.config.timeoutMs ?? DEFAULT_TIMEOUT_MS
        );

        if (resolved?.link) {
          const parsedResolvedUrl = parseIntentUrl(resolved.link);
          if (parsedResolvedUrl) {
            resolvedUrl = parsedResolvedUrl;
          } else {
            return normalizeRoute(resolved.link, fallbackPath);
          }
        }
      } catch (error) {
        options.config.onResolveError?.(error, { path, initial });
        return fallbackPath;
      }
    }

    let route: string;
    try {
      route = mapToRoute({
        resolvedUrl,
        originalPath: path,
        initial,
      });
    } catch (error) {
      options.config.onResolveError?.(error, { path, initial });
      return fallbackPath;
    }

    return normalizeRoute(route, fallbackPath);
  };
};
