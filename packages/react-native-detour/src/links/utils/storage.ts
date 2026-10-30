import type { DetourStorage } from "../types";

const STORAGE_KEY_PREFIX = "Detour_";
const FIRST_ENTRANCE_FLAG = `${STORAGE_KEY_PREFIX}firstEntranceFlag`;
const DEVICE_ID = `${STORAGE_KEY_PREFIX}deviceId`;
const INSTALL_TIME = `${STORAGE_KEY_PREFIX}installTime`;
const USER_ID = `${STORAGE_KEY_PREFIX}userId`;

export enum StorageKeys {
  FIRST_ENTRANCE_FLAG_KEY = FIRST_ENTRANCE_FLAG,
  DEVICE_ID_KEY = DEVICE_ID,
  INSTALL_TIME_KEY = INSTALL_TIME,
  USER_ID_KEY = USER_ID,
}

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
