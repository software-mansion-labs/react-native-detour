import type { DetourStorage } from "../links/types";
import { StorageKeys } from "../links/utils/storage";
import { isUserIdAllowed } from "./userIdPolicy";

type UserIdValidator = (userId: string) => boolean;

let storage: DetourStorage | null = null;
let validator: UserIdValidator | undefined;
// undefined: not read from storage yet; null: no user ID.
let currentUserId: string | null | undefined;

const persist = async () => {
  if (!storage || currentUserId === undefined) return;
  try {
    if (currentUserId !== null) {
      await storage.setItem(StorageKeys.USER_ID_KEY, currentUserId);
    } else if (storage.removeItem) {
      await storage.removeItem(StorageKeys.USER_ID_KEY);
    } else {
      await storage.setItem(StorageKeys.USER_ID_KEY, "");
    }
  } catch (error) {
    console.warn("🔗[Detour:IDENTITY] Failed to save user ID:", error);
  }
};

export const configureUserId = (userStorage: DetourStorage, userIdValidator?: UserIdValidator) => {
  storage = userStorage;
  validator = userIdValidator;
  persist();
};

export const setUserId = (userId: string | null) => {
  // A rejected value also clears the previous one, so requests never go out
  // with the identifier of the user the app has just switched away from.
  if (userId !== null && (!isUserIdAllowed(userId) || validator?.(userId) === false)) {
    console.warn(
      "🔗[Detour:IDENTITY] setUserId value rejected by the validator; not stored or sent.",
    );
    currentUserId = null;
  } else {
    currentUserId = userId;
  }
  persist();
};

export const getUserId = async (): Promise<string | null> => {
  if (currentUserId !== undefined) return currentUserId;
  if (!storage) return null;

  const stored = await storage.getItem(StorageKeys.USER_ID_KEY);
  if (currentUserId === undefined) currentUserId = stored || null;
  return currentUserId;
};
