import { type RemoteConfigPayload, parseRemoteConfigPayload } from "../remoteConfig";
import type { StorageAdapter } from "./resolveStorage";

const STORAGE_KEY_PREFIX = "detour-experiments:remote_config";

/** One App's cache key: a build pointed at another App must not start from this one's rules. */
export function remoteConfigStorageKey(appId: string | undefined): string {
  return appId ? `${STORAGE_KEY_PREFIX}:${appId}` : STORAGE_KEY_PREFIX;
}

let storageKey = remoteConfigStorageKey(undefined);
let memory: RemoteConfigPayload | null = null;
let fetchSettled = false;
let generation = 0;
let registeredStorage: StorageAdapter | undefined;
let storageHydrationStarted = false;
let storageRead = false;

const listeners = new Set<() => void>();

/** The payload with the higher `version`, which the dashboard raises on every change; `current` on a tie. */
export function pickNewerPayload(
  current: RemoteConfigPayload | null,
  incoming: RemoteConfigPayload | null,
): RemoteConfigPayload | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.version > current.version ? incoming : current;
}

export function parseStoredRemoteConfig(raw: unknown): RemoteConfigPayload | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return parseRemoteConfigPayload(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function getWebStorage(): WebStorage | null {
  try {
    const g = globalThis as { window?: { localStorage?: WebStorage } };
    return g.window?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readWebStorage(): RemoteConfigPayload | null {
  const storage = getWebStorage();
  if (!storage) return null;
  try {
    return parseStoredRemoteConfig(storage.getItem(storageKey));
  } catch {
    return null;
  }
}

function writeWebStorage(payload: RemoteConfigPayload): void {
  const storage = getWebStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

function notify(): void {
  generation += 1;
  for (const listener of listeners) listener();
}

export function getRemoteConfigGeneration(): number {
  return generation;
}

export function subscribeRemoteConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readCachedRemoteConfig(): RemoteConfigPayload | null {
  if (memory) return memory;
  memory = readWebStorage();
  return memory;
}

export function applyRemoteConfigPayload(incoming: RemoteConfigPayload | null): boolean {
  if (!incoming) return false;
  const current = readCachedRemoteConfig();
  const next = pickNewerPayload(current, incoming);
  if (!next || next === current) return false;
  memory = next;
  writeWebStorage(next);
  if (registeredStorage) {
    persistRemoteConfigToStorage(registeredStorage, next);
  }
  notify();
  return true;
}

export function hasRemoteConfigFetchSettled(): boolean {
  return fetchSettled;
}

/** Notifies even with a config in hand: a launch that waits for a fresh one starts on this. */
export function markRemoteConfigFetchSettled(): boolean {
  if (fetchSettled) return false;
  fetchSettled = true;
  notify();
  return true;
}

function persistRemoteConfigToStorage(storage: StorageAdapter, payload: RemoteConfigPayload): void {
  try {
    Promise.resolve(storage.setItem(storageKey, JSON.stringify(payload))).catch(() => {});
  } catch {
    // quota / private mode: the payload stays in memory
  }
}

/**
 * Points the cache at `appId`'s key. What is held for another App is dropped and read again from storage.
 * Call it before `registerRemoteConfigStorage`.
 */
export function selectRemoteConfigApp(appId: string | undefined): void {
  const key = remoteConfigStorageKey(appId);
  if (key === storageKey) return;
  storageKey = key;
  memory = null;
  storageHydrationStarted = false;
  storageRead = false;
}

/** Notifies even when nothing was found: that tells a first launch from one still reading its cache. */
export async function registerRemoteConfigStorage(storage: StorageAdapter): Promise<void> {
  registeredStorage = storage;
  if (storageHydrationStarted) return;
  storageHydrationStarted = true;
  const key = storageKey;
  try {
    const raw = await storage.getItem(key);
    if (key === storageKey) applyRemoteConfigPayload(parseStoredRemoteConfig(raw));
  } catch {
    // Unreadable storage: the fetch fills the cache instead.
  }
  if (key !== storageKey) return;
  storageRead = true;
  notify();
}

/** Whether the cached payload has been read from the registered storage, found or not. */
export function isRemoteConfigStorageRead(): boolean {
  return storageRead;
}

export function resetRemoteConfigCacheForTests(): void {
  memory = null;
  fetchSettled = false;
  generation = 0;
  registeredStorage = undefined;
  storageHydrationStarted = false;
  storageRead = false;
  listeners.clear();
  try {
    getWebStorage()?.removeItem(storageKey);
  } catch {
    // ignore
  }
  storageKey = remoteConfigStorageKey(undefined);
}
