import { type StorageAdapter, resolveStorage } from "./resolveStorage";

/**
 * The key the Detour SDK keeps its device id under. Exposures and outcomes are joined only by this id,
 * so both providers must get the same `storage`: two adapters mean two ids, and no outcome joins.
 */
export const DEVICE_ID_STORAGE_KEY = "Detour_deviceId";

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare const __DEV__: boolean | undefined;

function isDevRuntime(): boolean {
  return typeof __DEV__ !== "undefined" && Boolean(__DEV__);
}

/** A v4 UUID. Hermes has no `crypto.randomUUID`, so the fallback is Detour's own template. */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r % 4) + 8;
    return v.toString(16);
  });
}

function isGuid(value: unknown): value is string {
  return typeof value === "string" && GUID_PATTERN.test(value);
}

let hasWarnedInMemory = false;

function warnInMemoryOnce(reason: string): void {
  if (hasWarnedInMemory || !isDevRuntime()) return;
  hasWarnedInMemory = true;
  console.warn(
    `[Detour Experiments] ${reason}, so the device id lives in memory for this session. ` +
      `Users will be re-bucketed on every cold start, and exposures will not join the ` +
      `outcomes Detour logs for this device. Install ` +
      `@react-native-async-storage/async-storage or pass the config given to ` +
      `DetourProvider to DetourExperimentsProvider as \`detourConfig\`.`,
  );
}

type LoadedDeviceId = { id: string; persisted: boolean };

/** After writing a new id it reads the key back: Detour may have written its own, and the last write wins. */
async function loadDeviceId(explicit: StorageAdapter | undefined): Promise<LoadedDeviceId> {
  const storage = resolveStorage(explicit);
  if (!storage) {
    warnInMemoryOnce("No persistent storage is available");
    return { id: generateUuid(), persisted: false };
  }

  try {
    const stored = await storage.getItem(DEVICE_ID_STORAGE_KEY);
    if (isGuid(stored)) return { id: stored, persisted: true };

    const generated = generateUuid();
    await storage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    const settled = await storage.getItem(DEVICE_ID_STORAGE_KEY);
    return { id: isGuid(settled) ? settled : generated, persisted: true };
  } catch {
    warnInMemoryOnce("Reading the device id from storage failed");
    return { id: generateUuid(), persisted: false };
  }
}

/**
 * Cached as the promise itself: concurrent callers share one storage round
 * trip, and `loadDeviceId` never rejects. The first caller's adapter wins.
 */
let deviceIdPromise: Promise<string> | null = null;
let persistedDeviceId: string | null = null;

/** The device id shared with the Detour SDK, generating and persisting one on first use. */
export function resolveDeviceId(storage?: StorageAdapter): Promise<string> {
  if (!deviceIdPromise) {
    const loading = loadDeviceId(storage);
    const promise = loading.then(({ id }) => id);
    deviceIdPromise = promise;
    loading.then(({ id, persisted }) => {
      if (deviceIdPromise === promise && persisted) persistedDeviceId = id;
    });
  }
  return deviceIdPromise;
}

/**
 * The device id if it has already been read from storage, else `null`. An id that lives only in memory
 * is never returned, so a server never hands one process-wide id to every request.
 */
export function peekDeviceId(): string | null {
  return persistedDeviceId;
}

/** Exported for tests: clears the process-wide cache. */
export function resetDeviceIdForTests(): void {
  deviceIdPromise = null;
  persistedDeviceId = null;
  hasWarnedInMemory = false;
}
