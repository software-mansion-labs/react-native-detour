import type { DetourStorage } from "../links/types";
import { StorageKeys, removeStoredItem } from "../links/utils/storage";
import { isUserIdAllowed } from "./userIdPolicy";

export type UserIdValidator = (userId: string) => boolean;

// The backend rejects the whole request for a longer value.
const USER_ID_MAX_LENGTH = 256;

let storage: DetourStorage | null = null;
let validator: UserIdValidator | undefined;
let loaded: Promise<void> | null = null;
let isLoaded = false;
// A value passed before the stored one was read; checked once the validator is known.
let passedBeforeLoad: { userId: string | null } | null = null;
let currentUserId: string | null = null;

const rejectionOf = (userId: unknown): string | null => {
  if (typeof userId !== "string" || userId.length === 0 || userId.length > USER_ID_MAX_LENGTH) {
    return `the user ID must be a non-empty string of at most ${USER_ID_MAX_LENGTH} characters`;
  }
  if (!isUserIdAllowed(userId) || validator?.(userId) === false) {
    return "the user ID was rejected by the validator";
  }
  return null;
};

// A rejected value also clears the previous one, so requests never go out
// with the identifier of the user the app has just switched away from.
const accepted = (userId: string | null): string | null => {
  if (userId === null) return null;
  const rejection = rejectionOf(userId);
  if (rejection === null) return userId;
  console.warn(`🔗[Detour:IDENTITY] setUserId: ${rejection}; not stored or sent.`);
  return null;
};

const persist = async (userId: string | null) => {
  if (!storage) return;
  try {
    if (userId !== null) {
      await storage.setItem(StorageKeys.USER_ID_KEY, userId);
    } else {
      await removeStoredItem(storage, StorageKeys.USER_ID_KEY);
    }
  } catch (error) {
    console.warn("🔗[Detour:IDENTITY] Failed to save user ID:", error);
  }
};

const readStored = async (userStorage: DetourStorage): Promise<string | null> => {
  try {
    return (await userStorage.getItem(StorageKeys.USER_ID_KEY)) || null;
  } catch (error) {
    console.warn("🔗[Detour:IDENTITY] Failed to read user ID:", error);
    return null;
  }
};

// A stored value is checked too: the app may have added the validator in a new version.
const load = async (userStorage: DetourStorage) => {
  const stored = await readStored(userStorage);
  if (storage !== userStorage) return;
  const passed = passedBeforeLoad;
  passedBeforeLoad = null;
  currentUserId = accepted(passed ? passed.userId : stored);
  isLoaded = true;
  if (currentUserId !== stored) await persist(currentUserId);
};

/** Swapping the validator writes nothing, so an inline function in the config costs no write. */
export const setUserIdValidator = (userIdValidator: UserIdValidator | undefined) => {
  validator = userIdValidator;
};

export const configureUserId = (userStorage: DetourStorage) => {
  if (storage === userStorage) return;
  storage = userStorage;
  isLoaded = false;
  loaded = load(userStorage);
};

export const setUserId = (userId: string | null) => {
  if (!isLoaded) {
    passedBeforeLoad = { userId };
    return;
  }
  currentUserId = accepted(userId);
  persist(currentUserId);
};

export const getUserId = async (): Promise<string | null> => {
  await loaded;
  return isLoaded ? currentUserId : null;
};
