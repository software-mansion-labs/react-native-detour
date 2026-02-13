/* eslint-disable no-bitwise */
import type { DetourStorage } from '../../links/types';
import { StorageKeys } from '../../links/utils/storage';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const saveDeviceId = async (storage: DetourStorage, id: string) => {
  await storage.setItem(StorageKeys.DEVICE_ID_KEY, id);
};

const getDeviceId = async (storage: DetourStorage) => {
  return await storage.getItem(StorageKeys.DEVICE_ID_KEY);
};

export const prepareDeviceIdForApi = async (storage: DetourStorage) => {
  let id = null;
  id = await getDeviceId(storage);

  if (id === null) {
    id = generateUUID();
    saveDeviceId(storage, id);
  }

  return id;
};
