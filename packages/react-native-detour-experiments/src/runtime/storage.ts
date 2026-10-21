import { resetDevWarningsForTests, warnOnceInDev } from "./environment";

export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => unknown;
};

// AsyncStorage is required inside try/catch so Metro treats it as optional.
export function resolveStorage(explicit?: StorageAdapter): StorageAdapter | undefined {
  if (explicit) return explicit;
  if (typeof window === "undefined") return undefined;

  try {
    const mod = require("@react-native-async-storage/async-storage") as
      | (Partial<StorageAdapter> & { default?: Partial<StorageAdapter> })
      | undefined;
    const asyncStorage = mod?.default ?? mod;
    if (typeof asyncStorage?.getItem === "function" && typeof asyncStorage.setItem === "function") {
      return asyncStorage as StorageAdapter;
    }
  } catch {
    // Not installed.
  }

  try {
    if (window.localStorage) return window.localStorage;
  } catch {
    // Blocked by the browser.
  }

  return undefined;
}

// Shared with the Detour SDK: exposures and outcomes join only by this id.
export const DEVICE_ID_STORAGE_KEY = "Detour_deviceId";

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hermes has no `crypto.randomUUID`.
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

function warnInMemoryOnce(reason: string): void {
  warnOnceInDev(
    "device-id-in-memory",
    `[Detour Experiments] ${reason}, so the device id lives in memory for this session. ` +
      `Users will be re-bucketed on every cold start, and exposures will not join the ` +
      `outcomes Detour logs for this device. Install ` +
      `@react-native-async-storage/async-storage or pass the config given to ` +
      `DetourProvider to DetourExperimentsProvider as \`detourConfig\`.`,
  );
}

type LoadedDeviceId = { id: string; persisted: boolean };

// Reads the key back after writing: Detour may have written its own, and the last write wins.
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

// Cached as the promise itself, so concurrent callers share one storage round trip.
let deviceIdPromise: Promise<string> | null = null;
let persistedDeviceId: string | null = null;

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

// An id that lives only in memory is never returned, so a server never shares one id across requests.
export function peekDeviceId(): string | null {
  return persistedDeviceId;
}

export function resetDeviceIdForTests(): void {
  deviceIdPromise = null;
  persistedDeviceId = null;
  resetDevWarningsForTests();
}
