import type { DetourStorage } from "../links/types";

/** A `DetourStorage` in memory, with its items exposed for assertions. */
export const memoryStorage = () => {
  const items = new Map<string, string>();
  const storage: DetourStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
};
