/**
 * Minimal persistence contract, satisfied as-is by AsyncStorage, expo-secure-store,
 * MMKV and `localStorage`. Declared structurally so the SDK never imports those packages.
 */
export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => unknown;
};

/**
 * `explicit` when given, else the one Detour uses: AsyncStorage when installed, `localStorage` on web.
 * AsyncStorage is required inside try/catch so Metro treats it as optional. A server has no default.
 */
export function resolveStorage(explicit?: StorageAdapter): StorageAdapter | undefined {
  if (explicit) return explicit;
  if (typeof window === "undefined") return undefined;

  try {
    const mod = require("@react-native-async-storage/async-storage") as
      | (Partial<StorageAdapter> & { default?: Partial<StorageAdapter> })
      | undefined;
    const asyncStorage = mod?.default ?? mod;
    if (typeof asyncStorage?.getItem === "function" && typeof asyncStorage.setItem === "function") {
      return asyncStorage as StorageAdapter;
    }
  } catch {
    // Not installed.
  }

  try {
    if (window.localStorage) return window.localStorage;
  } catch {
    // Blocked by the browser (sandboxed frame, disabled site data).
  }

  return undefined;
}
