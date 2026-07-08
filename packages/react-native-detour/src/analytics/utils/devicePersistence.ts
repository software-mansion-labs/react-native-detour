import * as Crypto from "expo-crypto";

import type { DetourStorage } from "../../links/types";
import { StorageKeys } from "../../links/utils/storage";

// Math.random() is not cryptographically secure and risks collisions across
// installs at scale — this is the install_id anchor that ties app_installs,
// events and clicks together, so it needs a real CSPRNG.
const generateUUID = () => Crypto.randomUUID();

const saveDeviceId = async (storage: DetourStorage, id: string) => {
  await storage.setItem(StorageKeys.DEVICE_ID_KEY, id);
};

const getDeviceId = async (storage: DetourStorage) => {
  return await storage.getItem(StorageKeys.DEVICE_ID_KEY);
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

  const getOrGenerate = async () => {
    const existingId = await getDeviceId(storage);
    if (existingId) {
      cachedDeviceId = existingId;
      return existingId;
    }

    const newId = generateUUID();
    await saveDeviceId(storage, newId);
    cachedDeviceId = newId;
    return newId;
  };

  pendingDeviceIdPromise = getOrGenerate();

  try {
    return await pendingDeviceIdPromise;
  } finally {
    pendingDeviceIdPromise = null;
  }
};
