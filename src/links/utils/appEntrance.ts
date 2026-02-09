import type { DetourStorage } from '../types';
import { StorageKeys } from './storage';

export const markFirstEntrance = async (storage: DetourStorage) => {
  await storage.setItem(StorageKeys.FIRST_ENTRANCE_FLAG_KEY, 'true');
};

export const checkIsFirstEntrance = async (storage: DetourStorage) => {
  const hasAlreadyEnteredFlag = await storage.getItem(
    StorageKeys.FIRST_ENTRANCE_FLAG_KEY
  );

  return hasAlreadyEnteredFlag === null || hasAlreadyEnteredFlag === 'false';
};
