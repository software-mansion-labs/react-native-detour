/* eslint-disable no-bitwise */
import * as Application from "expo-application";

import type { DetourStorage } from "../../links/types";
import { resetFirstEntrance } from "../../links/utils/appEntrance";
import { StorageKeys } from "../../links/utils/storage";

type RandomUUID = () => string;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const resolveRandomUUID = (): RandomUUID | null => {
  try {
    const expoCrypto = require("expo-crypto");
    if (typeof expoCrypto?.randomUUID === "function") return expoCrypto.randomUUID;
  } catch {}

  const globalCrypto = (globalThis as { crypto?: { randomUUID?: RandomUUID } }).crypto;
  return typeof globalCrypto?.randomUUID === "function" ? () => globalCrypto.randomUUID!() : null;
};

let hasWarnedWeakRandom = false;

export const generateUUID = (): string => {
  const randomUUID = resolveRandomUUID();
  if (randomUUID) return randomUUID().toLowerCase();

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

const readInstallTime = async (): Promise<string | null> => {
  try {
    const installedAt = await Application.getInstallationTimeAsync();
    return installedAt ? String(installedAt.getTime()) : null;
  } catch {
    return null;
  }
};

// Storage can come back from a backup of another install (Android Auto Backup, restored phone).
// The OS sets the install time on every install and never restores it, so a mismatch means reuse.
const loadDeviceId = async (storage: DetourStorage): Promise<string> => {
  const [storedId, storedInstallTime, installTime] = await Promise.all([
    storage.getItem(StorageKeys.DEVICE_ID_KEY),
    storage.getItem(StorageKeys.INSTALL_TIME_KEY),
    readInstallTime(),
  ]);

  const restoredFromOtherInstall =
    storedInstallTime !== null && installTime !== null && storedInstallTime !== installTime;

  if (restoredFromOtherInstall) {
    await resetFirstEntrance(storage);
  }

  const existingId = restoredFromOtherInstall ? null : normalizeDeviceId(storedId);
  const deviceId = existingId ?? generateUUID();

  if (deviceId !== storedId) {
    await storage.setItem(StorageKeys.DEVICE_ID_KEY, deviceId);
  }
  // PROVISIONAL: an app updated from SDK 2.x has no stored install time yet; it keeps its
  // device ID and first-launch flag, so the update is not counted as a new install.
  if (installTime !== null && installTime !== storedInstallTime) {
    await storage.setItem(StorageKeys.INSTALL_TIME_KEY, installTime);
  }

  return deviceId;
};

let cachedDeviceId: string | null = null;
let pendingDeviceIdPromise: Promise<string> | null = null;

export const prepareDeviceIdForApi = async (storage: DetourStorage) => {
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
