import type { DetourStorage } from "@swmansion/react-native-detour";

import { type ConversionValueSchema, EMPTY_SCHEMA, parseSchema } from "./schema";

const SCHEMA_KEY = "Detour_conversionValueSchema";
const STATE_KEY = "Detour_conversionValueState";

// Kept with the install ID: the storage comes back from a backup on a new install, which must
// register again and starts its conversion value from zero.
/** What this install already reported to SKAdNetwork. */
export type InstallState = {
  installID: string;
  isRegistered: boolean;
  /** The highest value SKAdNetwork took from this install, or -1 before the first one. */
  highestFine: number;
  counts: Record<string, number>;
};

export type CachedSchema = { schema: ConversionValueSchema; etag: string | null };

const warn = (message: string, error: unknown) =>
  console.warn(`🔗[Detour:ATTRIBUTION] ${message}:`, error);

// A failed read throws, so the queue skips the step instead of saving a fresh state over the
// stored one. A corrupt value counts as missing.
const readJSON = async (storage: DetourStorage, key: string): Promise<unknown> => {
  const raw = await storage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    warn(`Ignoring corrupt ${key}`, error);
    return null;
  }
};

const writeJSON = async (storage: DetourStorage, key: string, value: unknown) => {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    warn(`Failed to save ${key}`, error);
  }
};

export const loadSchema = async (storage: DetourStorage): Promise<CachedSchema> => {
  const cached = await readJSON(storage, SCHEMA_KEY);
  const fields = (cached ?? {}) as { body?: unknown; etag?: unknown };
  const schema = parseSchema(fields.body);
  return schema
    ? { schema, etag: typeof fields.etag === "string" ? fields.etag : null }
    : { schema: EMPTY_SCHEMA, etag: null };
};

/** Saves the raw body, so a newer SDK reads fields this one does not know. */
export const saveSchema = (storage: DetourStorage, body: unknown, etag: string | null) =>
  writeJSON(storage, SCHEMA_KEY, { body, etag });

export const loadState = async (
  storage: DetourStorage,
  installID: string,
): Promise<InstallState> => {
  const stored = (await readJSON(storage, STATE_KEY)) as Partial<InstallState> | null;
  if (stored?.installID === installID) {
    return {
      installID,
      isRegistered: stored.isRegistered === true,
      highestFine: typeof stored.highestFine === "number" ? stored.highestFine : -1,
      counts: stored.counts ?? {},
    };
  }
  return { installID, isRegistered: false, highestFine: -1, counts: {} };
};

export const saveState = (storage: DetourStorage, state: InstallState) =>
  writeJSON(storage, STATE_KEY, state);
