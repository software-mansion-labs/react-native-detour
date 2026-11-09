/* eslint-disable no-bitwise */
import { Platform } from "react-native";

import * as Application from "expo-application";

import type { DetourStorage } from "../links/types";
import { resetFirstEntrance } from "../links/utils/appEntrance";
import { StorageKeys } from "../links/utils/storage";

type UUIDSource = () => string | undefined;

type WebCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const webCrypto = () => (globalThis as { crypto?: WebCrypto }).crypto;

const formatUUIDv4 = (bytes: Uint8Array) => {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Hermes has no Web Crypto, so without expo-crypto or a getRandomValues polyfill
// (react-native-get-random-values) the ID falls back to Math.random.
const UUID_SOURCES: UUIDSource[] = [
  () => {
    // Metro treats a require as optional only inside a try block.
    try {
      return require("expo-crypto").randomUUID();
    } catch {
      return undefined;
    }
  },
  () => webCrypto()?.randomUUID?.(),
  () => {
    const bytes = webCrypto()?.getRandomValues?.(new Uint8Array(16));
    return bytes ? formatUUIDv4(bytes) : undefined;
  },
];

let hasWarnedWeakRandom = false;

export const generateUUID = (): string => {
  for (const source of UUID_SOURCES) {
    try {
      // A package can be bundled without its native module (e.g. after an OTA update), so it may throw.
      const uuid = source()?.toLowerCase();
      if (uuid && UUID_PATTERN.test(uuid)) return uuid;
    } catch {}
  }

  if (!hasWarnedWeakRandom) {
    hasWarnedWeakRandom = true;
    console.warn(
      "🔗[Detour:WARNING] No secure random source found; install expo-crypto for a collision-safe device ID.",
    );
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const normalizeDeviceId = (value: string | null): string | null => {
  const normalized = value?.trim().toLowerCase() ?? null;
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
};

let hasWarnedInstallTime = false;

const readInstallTime = async (): Promise<string | null> => {
  try {
    const installedAt = await Application.getInstallationTimeAsync();
    return installedAt ? String(installedAt.getTime()) : null;
  } catch (error) {
    if (!hasWarnedInstallTime) {
      hasWarnedInstallTime = true;
      console.warn(
        "🔗[Detour:WARNING] Could not read the install time; a backup from another install is not detected.",
        error,
      );
    }
    return null;
  }
};

// Android reports the same install and update time until the first update.
const isNeverUpdatedAndroidInstall = async (installTime: string) => {
  if (Platform.OS !== "android") return false;
  try {
    const updatedAt = await Application.getLastUpdateTimeAsync();
    return String(updatedAt.getTime()) === installTime;
  } catch (error) {
    console.warn(
      "🔗[Detour:WARNING] Could not read the update time; a 2.x backup on a new install is not detected.",
      error,
    );
    return false;
  }
};

// Storage can come back from a backup of another install (Android Auto Backup, restored phone).
// The OS sets the install time on every install and never restores it, so a mismatch means reuse.
const isRestoredFromOtherInstall = async (
  storedInstallTime: string | null,
  installTime: string | null,
) => {
  if (installTime === null) return false;
  if (storedInstallTime !== null) return storedInstallTime !== installTime;
  // PROVISIONAL: no stored install time means an update from SDK 2.x, which keeps its device ID
  // and first-launch flag. On Android a never-updated app is a fresh install instead, whose
  // storage came from a backup of a 2.x install. iOS cannot tell the two apart.
  return isNeverUpdatedAndroidInstall(installTime);
};

const reconcile = async (storage: DetourStorage) => {
  const [storedInstallTime, installTime] = await Promise.all([
    storage.getItem(StorageKeys.INSTALL_TIME_KEY),
    readInstallTime(),
  ]);

  if (await isRestoredFromOtherInstall(storedInstallTime, installTime)) {
    await resetFirstEntrance(storage);
    await storage.setItem(StorageKeys.DEVICE_ID_KEY, generateUUID());
  }
  if (installTime !== null && installTime !== storedInstallTime) {
    await storage.setItem(StorageKeys.INSTALL_TIME_KEY, installTime);
  }
};

let reconciled: Promise<void> | null = null;

/**
 * Starts a new install (new device ID, first-launch flag cleared) when the storage came from a
 * backup of another install. Runs once per launch and never throws; must finish before the
 * first-launch flag is read or set.
 */
export const reconcileInstall = (storage: DetourStorage): Promise<void> => {
  reconciled ??= reconcile(storage).catch((error) => {
    console.warn("🔗[Detour:WARNING] Could not check the storage for a backup:", error);
  });
  return reconciled;
};

const loadDeviceId = async (storage: DetourStorage): Promise<string> => {
  await reconcileInstall(storage);
  const storedId = await storage.getItem(StorageKeys.DEVICE_ID_KEY);
  const deviceId = normalizeDeviceId(storedId) ?? generateUUID();
  if (deviceId !== storedId) {
    await storage.setItem(StorageKeys.DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

let cachedDeviceId: string | null = null;
let pendingDeviceIdPromise: Promise<string> | null = null;

export const getDeviceId = async (storage: DetourStorage) => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  if (pendingDeviceIdPromise) {
    return pendingDeviceIdPromise;
  }

  pendingDeviceIdPromise = loadDeviceId(storage);

  try {
    cachedDeviceId = await pendingDeviceIdPromise;
    return cachedDeviceId;
  } finally {
    pendingDeviceIdPromise = null;
  }
};
