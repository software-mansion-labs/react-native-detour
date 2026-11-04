import { readDeviceAttributes } from "./deviceAttributes";
import { backgroundTimer } from "./environment";
import {
  hasRemoteConfigFetchSettled,
  isRemoteConfigStorageRead,
  readCachedRemoteConfig,
  subscribeRemoteConfig,
} from "./remoteConfigCache";
import type { RemoteConfigFetchCache } from "./remoteConfigFetch";
import { prefetchRemoteConfig } from "./remoteConfigSync";
import {
  STORAGE_DEADLINE_MS,
  firstLaunchBudgetMs,
  isSessionReady,
  readSession,
  refreshBudgetMs,
  startSession,
  subscribeSession,
} from "./session";
import { type StorageAdapter, peekDeviceId, resolveDeviceId, resolveStorage } from "./storage";

export type LaunchOptions = {
  apiKey?: string | undefined;
  appId?: string | undefined;
  storage?: StorageAdapter | undefined;
  firstLaunchTimeoutMs?: number | undefined;
  refreshTimeoutMs?: number | undefined;
  appVersion?: string | undefined;
};

// A launch that waits for a fresh config asks past the HTTP cache, which may hold one for 30 s.
export function prefetchLaunchConfig(options: LaunchOptions): void {
  const cache: RemoteConfigFetchCache =
    refreshBudgetMs(options.refreshTimeoutMs) > 0 ? "no-cache" : "default";
  prefetchRemoteConfig({
    apiKey: options.apiKey,
    appId: options.appId,
    storage: resolveStorage(options.storage),
    cache,
  });
}

let stopLaunch: (() => void) | null = null;

// Runs outside React: a suspended root never commits, so no effect could start it.
export function startLaunch(options: LaunchOptions = {}): void {
  if (stopLaunch !== null || readSession() !== null) return;

  const storage = resolveStorage(options.storage);
  const firstLaunchMs = firstLaunchBudgetMs(options.firstLaunchTimeoutMs);
  const refreshMs = refreshBudgetMs(options.refreshTimeoutMs);

  let deviceId = peekDeviceId();
  let firstLaunchBudgetElapsed = firstLaunchMs <= 0;
  let refreshBudgetElapsed = refreshMs <= 0;
  let storageDeadlineElapsed = false;
  let stopped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const subscriptions: (() => void)[] = [];

  const stop = () => {
    if (stopped) return;
    stopped = true;
    stopLaunch = null;
    for (const timer of timers) clearTimeout(timer);
    for (const unsubscribe of subscriptions) unsubscribe();
  };

  const decide = () => {
    if (stopped) return;
    const ready = isSessionReady({
      deviceIdRead: deviceId !== null,
      configRead: storage ? isRemoteConfigStorageRead() : true,
      hasConfig: readCachedRemoteConfig() !== null,
      fetchSettled: hasRemoteConfigFetchSettled(),
      firstLaunchBudgetElapsed,
      refreshBudgetElapsed,
      storageDeadlineElapsed,
    });
    if (!ready) return;
    stop();
    startSession({
      deviceId,
      remoteConfig: readCachedRemoteConfig(),
      attributes: readDeviceAttributes({ appVersion: options.appVersion }),
    });
  };

  const after = (ms: number, elapse: () => void) => {
    timers.push(
      backgroundTimer(() => {
        elapse();
        decide();
      }, ms),
    );
  };

  stopLaunch = stop;
  subscriptions.push(subscribeSession(stop));
  subscriptions.push(subscribeRemoteConfig(decide));

  prefetchLaunchConfig(options);
  resolveDeviceId(storage).then((id) => {
    deviceId = id;
    decide();
  });

  after(STORAGE_DEADLINE_MS, () => {
    storageDeadlineElapsed = true;
  });
  if (!firstLaunchBudgetElapsed) {
    after(firstLaunchMs, () => {
      firstLaunchBudgetElapsed = true;
    });
  }
  if (!refreshBudgetElapsed) {
    after(refreshMs, () => {
      refreshBudgetElapsed = true;
    });
  }

  decide();
}

export function resetLaunchForTests(): void {
  stopLaunch?.();
}
