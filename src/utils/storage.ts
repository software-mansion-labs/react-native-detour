import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DetourStorage } from '../types';

const STORAGE_KEY_PREFIX = 'Detour_';
const FIRST_ENTRANCE_FLAG = `${STORAGE_KEY_PREFIX}firstEntranceFlag`;

export enum StorageKeys {
  FIRST_ENTRANCE_FLAG_KEY = FIRST_ENTRANCE_FLAG,
}

export const DefaultStorage: DetourStorage = AsyncStorage || {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};
