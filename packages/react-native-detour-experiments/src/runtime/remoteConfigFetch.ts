import { REMOTE_CONFIG_URL, SDK_HEADER } from "../config";
import { type RemoteConfigPayload, parseRemoteConfigPayload } from "../remoteConfig";
import {
  applyRemoteConfigPayload,
  markRemoteConfigFetchSettled,
  selectRemoteConfigApp,
} from "./remoteConfigCache";

export type RemoteConfigFetchCache = "default" | "no-cache";

export type FetchRemoteConfigOptions = {
  apiKey?: string | undefined;
  /** The App the key belongs to, sent as `X-App-ID`. */
  appId?: string | undefined;
  /** Node-side callers only: another dashboard than the hosted one. */
  url?: string | undefined;
  cache?: RemoteConfigFetchCache | undefined;
  fetchImpl?: typeof fetch | undefined;
};

export type RefreshRemoteConfigResult = {
  changed: boolean;
  payload: RemoteConfigPayload | null;
};

declare const __DEV__: boolean | undefined;

/** How long one request may take before it is given up on. */
const REQUEST_TIMEOUT_MS = 8_000;

let inflight: Promise<RefreshRemoteConfigResult> | null = null;
/**
 * An unreachable dashboard is an expected, recoverable state, and the sync loop retries every 30 s.
 * So the warning is given once per failure streak, not on every poll.
 */
let failureStreak = false;

/**
 * Has a time limit of its own: a request that never answers would stay in flight, and every later
 * refresh would join it. Not `AbortSignal.timeout`, which React Native has only with Expo.
 */
export async function fetchRemoteConfig(
  options: FetchRemoteConfigOptions = {},
): Promise<RemoteConfigPayload | null> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  const headers: Record<string, string> = { "X-SDK": SDK_HEADER };
  if (options.apiKey) headers["Authorization"] = `Bearer ${options.apiKey}`;
  if (options.appId) headers["X-App-ID"] = options.appId;

  const init: RequestInit = { headers };
  if (options.cache) init.cache = options.cache;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  if (controller) init.signal = controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error(`no answer in ${REQUEST_TIMEOUT_MS / 1000} s`));
    }, REQUEST_TIMEOUT_MS);
    (timer as { unref?: () => void }).unref?.();
  });

  const url = options.url ?? REMOTE_CONFIG_URL;
  try {
    const response = await Promise.race([fetchImpl(url, init), timedOut]);
    if (!response.ok) return null;
    failureStreak = false;
    return parseRemoteConfigPayload(await response.json());
  } catch (error) {
    if (!failureStreak && typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(
        `[Detour Experiments] Could not fetch remote config from ${url}; using the cached snapshot. ` +
          `Retrying in the background. (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    failureStreak = true;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A fetch that names its App caches under that App's key, also when it runs before the provider mounts. */
async function refreshRemoteConfigOnce(
  options: FetchRemoteConfigOptions,
): Promise<RefreshRemoteConfigResult> {
  const payload = await fetchRemoteConfig(options);
  if (options.appId) selectRemoteConfigApp(options.appId);
  const changed = applyRemoteConfigPayload(payload);
  markRemoteConfigFetchSettled();
  return { changed, payload };
}

/** Shares one in-flight request between the render-time prefetch, the sync loop and an app's own call. */
export function refreshRemoteConfig(
  options: FetchRemoteConfigOptions = {},
): Promise<RefreshRemoteConfigResult> {
  if (inflight) return inflight;
  inflight = refreshRemoteConfigOnce(options).finally(() => {
    inflight = null;
  });
  return inflight;
}

export function resetRemoteConfigFetchForTests(): void {
  inflight = null;
  failureStreak = false;
}
