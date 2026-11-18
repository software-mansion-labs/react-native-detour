import { resetDevWarningsForTests, warnOnceInDev } from "./environment";

export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => unknown;
  // Used by `clearExperimentsData`. Without it, a key is overwritten with an empty value instead.
  removeItem?: ((key: string) => unknown) | undefined;
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

export function removeStoredItem(
  storage: StorageAdapter,
  key: string,
  empty: string,
): Promise<void> {
  try {
    const removal = storage.removeItem ? storage.removeItem(key) : storage.setItem(key, empty);
    return Promise.resolve(removal).then(
      () => {},
      () => {},
    );
  } catch {
    return Promise.resolve();
  }
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

// Lowercase, as the Detour SDK stores it, so both SDKs send the same string for one device.
function normalizeGuid(value: unknown): string | null {
  return isGuid(value) ? value.toLowerCase() : null;
}

type DetourDeviceIdGetter = (storage?: StorageAdapter) => Promise<string>;

type DetourModule = { getDetourDeviceId?: unknown };

// The first version of the Detour SDK with `getDetourDeviceId`. Keep in sync with the peer range.
const DETOUR_VERSION_WITH_DEVICE_ID_GETTER = "2.5.0";

// Required inside try/catch so Metro treats the Detour SDK as optional. `null`: not installed.
function requireDetourModule(): DetourModule | null {
  try {
    return (require("@swmansion/react-native-detour") as DetourModule | undefined) ?? {};
  } catch {
    return null;
  }
}

let loadDetourModule = requireDetourModule;

type DetourSdk = {
  installed: boolean;
  // `null` when it is not installed, and when it is a version from before the getter.
  getDeviceId: DetourDeviceIdGetter | null;
};

// The Detour SDK owns the id when it is installed: it keeps the id in memory after its first
// read, so an id written here on a first launch would differ from its own for that session.
export function detectDetourSdk(): DetourSdk {
  const mod = loadDetourModule();
  if (mod === null) return { installed: false, getDeviceId: null };
  const getter = mod.getDetourDeviceId;
  return {
    installed: true,
    getDeviceId: typeof getter === "function" ? (getter as DetourDeviceIdGetter) : null,
  };
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

function warnDetourOwnsIdOnce(hasGetter: boolean): void {
  const cause = hasGetter
    ? "@swmansion/react-native-detour returned no valid device id"
    : "The installed @swmansion/react-native-detour has no `getDetourDeviceId` and has stored " +
      "no device id yet";
  const fix = hasGetter
    ? ""
    : ` Update @swmansion/react-native-detour to ${DETOUR_VERSION_WITH_DEVICE_ID_GETTER} or newer.`;
  warnOnceInDev(
    "device-id-owned-by-detour",
    `[Detour Experiments] ${cause}. Only the Detour SDK writes the id both SDKs share, so the ` +
      `device id lives in memory for this session, and its exposures will not join the events ` +
      `Detour logs for this device.${fix}`,
  );
}

type LoadedDeviceId = { id: string; persisted: boolean };

export async function loadDeviceId(explicit: StorageAdapter | undefined): Promise<LoadedDeviceId> {
  const storage = resolveStorage(explicit);
  if (!storage) {
    warnInMemoryOnce("No persistent storage is available");
    return { id: generateUuid(), persisted: false };
  }

  try {
    const detour = detectDetourSdk();
    if (detour.getDeviceId) {
      const id = normalizeGuid(await detour.getDeviceId(storage));
      if (id) return { id, persisted: true };
    }

    const stored = normalizeGuid(await storage.getItem(DEVICE_ID_STORAGE_KEY));
    if (stored) return { id: stored, persisted: true };

    // Never written next to the Detour SDK: a version without the getter writes its own id on a
    // first launch, and this write would replace it from the next launch on.
    if (detour.installed) {
      warnDetourOwnsIdOnce(detour.getDeviceId !== null);
      return { id: generateUuid().toLowerCase(), persisted: false };
    }

    const generated = generateUuid().toLowerCase();
    await storage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return { id: generated, persisted: true };
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

// For `clearExperimentsData`. Without the Detour SDK this package created the id, so it removes
// it. Next to the Detour SDK, with or without the getter, the id stays: that SDK owns it.
// The id of this launch stays in memory, as its session was bucketed with it.
export async function removeOwnDeviceId(storage: StorageAdapter | undefined): Promise<void> {
  if (detectDetourSdk().installed) return;
  // A load in flight would store its id after the removal.
  await deviceIdPromise;
  if (storage) await removeStoredItem(storage, DEVICE_ID_STORAGE_KEY, "");
}

// `undefined` restores the real `require`.
export function setDetourModuleForTests(load: (() => DetourModule | null) | undefined): void {
  loadDetourModule = load ?? requireDetourModule;
}

export function resetDeviceIdForTests(): void {
  deviceIdPromise = null;
  persistedDeviceId = null;
  loadDetourModule = requireDetourModule;
  resetDevWarningsForTests();
}
