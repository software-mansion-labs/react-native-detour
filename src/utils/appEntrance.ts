import {
  AsyncStorageKeys,
  getValueFromAsyncStorage,
  saveValueToAsyncStorage,
} from './storage';

export const markFirstEntrance = async () => {
  await saveValueToAsyncStorage(
    AsyncStorageKeys.FIRST_ENTRANCE_FLAG_KEY,
    'true'
  );
};

export const checkIsFirstEntrance = async () => {
  const isFirstEntrance = await getValueFromAsyncStorage(
    AsyncStorageKeys.FIRST_ENTRANCE_FLAG_KEY
  );
  return isFirstEntrance === null || isFirstEntrance === 'false';
};
