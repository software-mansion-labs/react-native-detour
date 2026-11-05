import { normalizeRawLink } from "./urlHelpers";

type Entry<T> = { value: T; storedAt: number };

// Two spellings of one link, such as `//host/x` and `https://host/x`, share one key.
const toLinkKey = (url: string) => {
  try {
    return new URL(normalizeRawLink(url)).toString();
  } catch {
    return url;
  }
};

/**
 * Remembers one value per link for `windowMs`.
 */
export const createLinkRegistry = <T>(windowMs: number) => {
  const entries = new Map<string, Entry<T>>();

  const forgetExpired = (now: number) => {
    for (const [key, entry] of entries) {
      if (now - entry.storedAt >= windowMs) {
        entries.delete(key);
      }
    }
  };

  return {
    get: (url: string) => {
      const now = Date.now();
      forgetExpired(now);
      const entry = entries.get(toLinkKey(url));
      return entry && { value: entry.value, ageMs: now - entry.storedAt };
    },
    set: (url: string, value: T) => {
      entries.set(toLinkKey(url), { value, storedAt: Date.now() });
    },
    // Keeps a newer value stored for the same link in the meantime.
    forget: (url: string, value: T) => {
      const key = toLinkKey(url);
      if (entries.get(key)?.value === value) {
        entries.delete(key);
      }
    },
    clear: () => entries.clear(),
  };
};
