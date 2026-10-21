import {
  hasRemoteConfigFetchSettled,
  registerRemoteConfigStorage,
  selectRemoteConfigApp,
} from "./remoteConfigCache";
import {
  type FetchRemoteConfigOptions,
  type RemoteConfigFetchCache,
  refreshRemoteConfig,
} from "./remoteConfigFetch";
import type { StorageAdapter } from "./storage";

const REMOTE_CONFIG_POLL_MS = 30_000;

type StartRemoteConfigSyncOptions = {
  apiKey?: string | undefined;
  appId?: string | undefined;
  storage?: StorageAdapter | undefined;
  fetchImpl?: typeof fetch;
  onChange?: () => void;
};

type PrefetchRemoteConfigOptions = StartRemoteConfigSyncOptions & {
  cache?: RemoteConfigFetchCache | undefined;
};

export function subscribeAppStateForeground(onActive: () => void): () => void {
  type AppStateLike = {
    addEventListener: (type: "change", listener: (state: string) => void) => { remove: () => void };
  };
  try {
    const rn = require("react-native") as { AppState?: AppStateLike };
    if (!rn.AppState) return () => {};
    const subscription = rn.AppState.addEventListener("change", (state) => {
      if (state === "active") onActive();
    });
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

function loadOptions(
  options: StartRemoteConfigSyncOptions,
  cache: RemoteConfigFetchCache,
): FetchRemoteConfigOptions {
  return {
    cache,
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.appId ? { appId: options.appId } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  };
}

function bindCache(options: StartRemoteConfigSyncOptions): void {
  selectRemoteConfigApp(options.appId);
  if (options.storage) registerRemoteConfigStorage(options.storage);
}

export function prefetchRemoteConfig(options: PrefetchRemoteConfigOptions = {}): void {
  bindCache(options);
  if (hasRemoteConfigFetchSettled()) return;
  refreshRemoteConfig(loadOptions(options, options.cache ?? "default"));
}

export function startRemoteConfigSync(options: StartRemoteConfigSyncOptions = {}): () => void {
  bindCache(options);

  let cancelled = false;
  const load = (cache: RemoteConfigFetchCache) => {
    refreshRemoteConfig(loadOptions(options, cache)).then((result) => {
      if (cancelled) return;
      if (result.changed) options.onChange?.();
    });
  };

  prefetchRemoteConfig(options);
  const interval = setInterval(() => load("no-cache"), REMOTE_CONFIG_POLL_MS);
  const unsubscribeAppState = subscribeAppStateForeground(() => load("no-cache"));

  return () => {
    cancelled = true;
    clearInterval(interval);
    unsubscribeAppState();
  };
}
