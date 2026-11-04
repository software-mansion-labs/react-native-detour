import type { DetourStorage } from "../links/types";
import { StorageKeys } from "../links/utils/storage";
import { type DetourRequestConfig, detourFetch } from "../net/client";
import { DetourPurpose } from "./purposes";

/** `open` sends while the app has not passed a consent decision; `closed` waits for `setConsent`. */
export type ConsentGateDefault = "open" | "closed";

/** The per-app values from `GET /api/sdk/config` that the SDK uses. */
export type SdkConfig = {
  schemaVersion: number;
  consentGateDefaults: Record<string, ConsentGateDefault>;
};

// The only gate values written in the SDK, used before the first successful fetch
// (API contract, consent gate fallback). Every other value comes from the server.
export const FALLBACK_SDK_CONFIG: SdkConfig = {
  schemaVersion: 1,
  consentGateDefaults: { [DetourPurpose.analytics]: "open" },
};

/** A purpose the config does not list waits for consent. */
export const gateDefault = (config: SdkConfig, purpose: string): ConsentGateDefault =>
  config.consentGateDefaults[purpose] ?? "closed";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** null for a body in another shape, so an unexpected response never replaces a good config. */
export const parseSdkConfig = (body: unknown): SdkConfig | null => {
  if (
    !isRecord(body) ||
    typeof body.schema_version !== "number" ||
    !isRecord(body.consent_gate_default)
  ) {
    return null;
  }
  const consentGateDefaults = Object.fromEntries(
    Object.entries(body.consent_gate_default).filter(
      (entry): entry is [string, ConsentGateDefault] =>
        entry[1] === "open" || entry[1] === "closed",
    ),
  );
  return { schemaVersion: body.schema_version, consentGateDefaults };
};

type Cached = { appID: string; etag: string | null; body: unknown };

let storage: DetourStorage | null = null;
let appID: string | null = null;
let cached: Cached | null = null;
let current: SdkConfig = FALLBACK_SDK_CONFIG;
let loading: Promise<void> | null = null;

const readCache = async () => {
  if (!storage) return;
  try {
    const raw = await storage.getItem(StorageKeys.SDK_CONFIG_KEY);
    const saved = raw ? (JSON.parse(raw) as Cached) : null;
    // A cache from another app ID is ignored.
    const config = saved?.appID === appID ? parseSdkConfig(saved.body) : null;
    if (saved && config) {
      cached = saved;
      current = config;
    }
  } catch {
    // An unreadable cache leaves the fallback.
  }
};

export const configureSdkConfig = (userStorage: DetourStorage, userAppID: string) => {
  if (storage === userStorage && appID === userAppID) return;
  storage = userStorage;
  appID = userAppID;
  cached = null;
  current = FALLBACK_SDK_CONFIG;
  loading = readCache();
};

/** Waits for the cached config on first use, so no request is decided by the fallback by mistake. */
export const getSdkConfig = async (): Promise<SdkConfig> => {
  await loading;
  return current;
};

/** The config as loaded so far: the fallback until the cache is read. */
export const latestSdkConfig = () => current;

/** Applies a fetched body; returns true when the config changed. */
export const applySdkConfig = async (body: unknown, etag: string | null): Promise<boolean> => {
  await loading;
  const config = parseSdkConfig(body);
  if (!config || appID === null) return false;

  cached = { appID, etag, body };
  try {
    await storage?.setItem(StorageKeys.SDK_CONFIG_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn("🔗[Detour:CONFIG] Failed to save the sdk config:", error);
  }
  const changed = JSON.stringify(config) !== JSON.stringify(current);
  current = config;
  return changed;
};

/** Once per launch, so a value changed on the server reaches the app on its next launch. */
export const refreshSdkConfig = async (config: DetourRequestConfig): Promise<boolean> => {
  await loading;
  try {
    const response = await detourFetch("sdkConfig", {
      config,
      method: "GET",
      headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
    });
    if (response === null || response.status === 304) return false;
    if (!response.ok) {
      console.warn(
        `🔗[Detour:CONFIG] sdk/config fetch failed: ${response.status}; using the last config.`,
      );
      return false;
    }
    return await applySdkConfig(await response.json(), response.headers.get("ETag"));
  } catch (error) {
    console.warn("🔗[Detour:CONFIG] sdk/config fetch failed; using the last config.", error);
    return false;
  }
};
