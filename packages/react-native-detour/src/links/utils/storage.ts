import type { DetourStorage } from "../types";

const STORAGE_KEY_PREFIX = "Detour_";
const FIRST_ENTRANCE_FLAG = `${STORAGE_KEY_PREFIX}firstEntranceFlag`;
const DEVICE_ID = `${STORAGE_KEY_PREFIX}deviceId`;
const INSTALL_TIME = `${STORAGE_KEY_PREFIX}installTime`;
const USER_ID = `${STORAGE_KEY_PREFIX}userId`;
const SDK_CONFIG = `${STORAGE_KEY_PREFIX}sdkConfig`;
const CONSENT = `${STORAGE_KEY_PREFIX}consent`;
const REPORTED_CONSENT = `${STORAGE_KEY_PREFIX}reportedConsent`;
const ENABLED = `${STORAGE_KEY_PREFIX}enabled`;
const REPORTED_ENABLED = `${STORAGE_KEY_PREFIX}reportedEnabled`;
const ENABLED_CHANGED_AT = `${STORAGE_KEY_PREFIX}enabledChangedAt`;

export enum StorageKeys {
  FIRST_ENTRANCE_FLAG_KEY = FIRST_ENTRANCE_FLAG,
  DEVICE_ID_KEY = DEVICE_ID,
  INSTALL_TIME_KEY = INSTALL_TIME,
  USER_ID_KEY = USER_ID,
  SDK_CONFIG_KEY = SDK_CONFIG,
  CONSENT_KEY = CONSENT,
  REPORTED_CONSENT_KEY = REPORTED_CONSENT,
  ENABLED_KEY = ENABLED,
  REPORTED_ENABLED_KEY = REPORTED_ENABLED,
  ENABLED_CHANGED_AT_KEY = ENABLED_CHANGED_AT,
}

/** `removeItem` is optional in `DetourStorage`; an empty string reads back as no value. */
export const removeStoredItem = async (storage: DetourStorage, key: string) => {
  if (storage.removeItem) {
    await storage.removeItem(key);
  } else {
    await storage.setItem(key, "");
  }
};

let DefaultAsyncStorage: DetourStorage | null = null;

try {
  const storageModule = require("@react-native-async-storage/async-storage");

  DefaultAsyncStorage = storageModule.default || storageModule;
} catch (e) {
  DefaultAsyncStorage = null;
}

export const resolveStorage = (userStorage?: DetourStorage): DetourStorage => {
  if (userStorage) {
    return userStorage;
  }

  if (DefaultAsyncStorage) {
    return DefaultAsyncStorage;
  }
  throw new Error(
    "🔗[Detour] No storage implementation provided.\n" +
      'Please install "@react-native-async-storage/async-storage" OR pass a custom "storage" in the config',
  );
};
