import { REMOTE_CONFIG_URL, sdkHeaders } from "../config";
import { type RemoteConfigPayload, parseRemoteConfigPayload } from "../remoteConfig";
import { backgroundTimer, isDevRuntime } from "./environment";
import {
  applyRemoteConfigPayload,
  clearRemoteConfigCache,
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

// The key was revoked, or the App lost Experiments or no longer exists. A cached config would
// keep assigning variants whose exposures the backend rejects, so it is dropped for the defaults.
const ACCESS_LOST_STATUSES = new Set([401, 403, 404]);

type FetchOutcome = { payload: RemoteConfigPayload | null; accessLost: boolean };

const NO_PAYLOAD: FetchOutcome = { payload: null, accessLost: false };

let inflight: Promise<RefreshRemoteConfigResult> | null = null;
// A refresh runs on every foreground, so an unreachable dashboard warns once per failure streak.
let failureStreak = false;

// Has its own time limit, as a request that never answers would make every later refresh join it.
// Not `AbortSignal.timeout`, which React Native has only with Expo.
export async function fetchRemoteConfig(
  options: FetchRemoteConfigOptions = {},
): Promise<RemoteConfigPayload | null> {
  return (await requestRemoteConfig(options)).payload;
}

async function requestRemoteConfig(options: FetchRemoteConfigOptions): Promise<FetchOutcome> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return NO_PAYLOAD;

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
    if (ACCESS_LOST_STATUSES.has(response.status)) {
      if (isDevRuntime()) {
        console.warn(
          `[Detour Experiments] Remote config answered ${response.status}: check the API key and App ID, ` +
            `and that Experiments is enabled for the App. Every experiment and flag uses its default.`,
        );
      }
      failureStreak = false;
      return { payload: null, accessLost: true };
    }
    if (!response.ok) return NO_PAYLOAD;
    failureStreak = false;
    return { payload: parseRemoteConfigPayload(await response.json()), accessLost: false };
  } catch (error) {
    if (!failureStreak && isDevRuntime()) {
      console.warn(
        `[Detour Experiments] Could not fetch remote config from ${url}; using the cached snapshot. ` +
          `Retrying in the background. (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    failureStreak = true;
    return NO_PAYLOAD;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshRemoteConfigOnce(
  options: FetchRemoteConfigOptions,
): Promise<RefreshRemoteConfigResult> {
  const { payload, accessLost } = await requestRemoteConfig(options);
  if (options.appId) selectRemoteConfigApp(options.appId);
  // The session of this launch keeps its assignments; the next cold start gets the defaults.
  const changed = accessLost ? await clearRemoteConfigCache() : applyRemoteConfigPayload(payload);
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
