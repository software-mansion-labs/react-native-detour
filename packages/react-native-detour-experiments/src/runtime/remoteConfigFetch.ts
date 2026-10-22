import { REMOTE_CONFIG_URL, sdkHeaders } from "../config";
import { type RemoteConfigPayload, parseRemoteConfigPayload } from "../remoteConfig";
import { backgroundTimer, isDevRuntime } from "./environment";
import {
  applyRemoteConfigPayload,
  markRemoteConfigFetchSettled,
  selectRemoteConfigApp,
} from "./remoteConfigCache";

export type RemoteConfigFetchCache = "default" | "no-cache";

export type FetchRemoteConfigOptions = {
  apiKey?: string | undefined;
  appId?: string | undefined;
  url?: string | undefined;
  cache?: RemoteConfigFetchCache | undefined;
  fetchImpl?: typeof fetch | undefined;
};

export type RefreshRemoteConfigResult = {
  changed: boolean;
  payload: RemoteConfigPayload | null;
};

const REQUEST_TIMEOUT_MS = 8_000;

let inflight: Promise<RefreshRemoteConfigResult> | null = null;
// The sync loop retries every 30 s, so an unreachable dashboard warns once per failure streak.
let failureStreak = false;

// Has its own time limit, as a request that never answers would make every later refresh join it.
// Not `AbortSignal.timeout`, which React Native has only with Expo.
export async function fetchRemoteConfig(
  options: FetchRemoteConfigOptions = {},
): Promise<RemoteConfigPayload | null> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  const init: RequestInit = { headers: sdkHeaders(options.apiKey, options.appId) };
  if (options.cache) init.cache = options.cache;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  if (controller) init.signal = controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = backgroundTimer(() => {
      controller?.abort();
      reject(new Error(`no answer in ${REQUEST_TIMEOUT_MS / 1000} s`));
    }, REQUEST_TIMEOUT_MS);
  });

  const url = options.url ?? REMOTE_CONFIG_URL;
  try {
    const response = await Promise.race([fetchImpl(url, init), timedOut]);
    if (!response.ok) return null;
    failureStreak = false;
    return parseRemoteConfigPayload(await response.json());
  } catch (error) {
    if (!failureStreak && isDevRuntime()) {
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

async function refreshRemoteConfigOnce(
  options: FetchRemoteConfigOptions,
): Promise<RefreshRemoteConfigResult> {
  const payload = await fetchRemoteConfig(options);
  if (options.appId) selectRemoteConfigApp(options.appId);
  const changed = applyRemoteConfigPayload(payload);
  markRemoteConfigFetchSettled();
  return { changed, payload };
}

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
