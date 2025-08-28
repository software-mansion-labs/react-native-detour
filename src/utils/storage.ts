import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@Detour:';
const FIRST_ENTRANCE_FLAG = `${STORAGE_KEY_PREFIX}firstEntranceFlag`;

export enum AsyncStorageKeys {
  FIRST_ENTRANCE_FLAG_KEY = FIRST_ENTRANCE_FLAG,
}

export const saveValueToAsyncStorage = async (key: string, value: string) => {
  await AsyncStorage.setItem(key, value);
};

export const getValueFromAsyncStorage = async (key: string) => {
  return await AsyncStorage.getItem(key);
};

export const removeValueFromAsyncStorage = async (key: string) => {
  await AsyncStorage.removeItem(key);
};
