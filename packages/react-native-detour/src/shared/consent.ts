import type { DetourStorage } from "./storage";
import { StorageKeys } from "./storage";

// Two independent layers, resolved on read instead of merged on write. Merging
// on write made the result depend on whether the OS read or the host's
// setConsent() landed first — the same user behaviour could produce two
// different records. Layers never overwrite each other, so ordering is moot.
//
// Resolution is per field: when both layers have an opinion, the restrictive
// one wins. A record therefore never claims more than the user actually gave,
// in either direction — a denied ATT can't be talked up by the host's banner,
// and a banner opt-out can't be undone by a granted ATT.

export type ConsentSource = "att" | "aaid-optout" | "manual" | "mixed";

export type Consent = {
  ad?: boolean;
  analytics?: boolean;
  tracking?: boolean;
  source?: ConsentSource;
  updatedAt?: number;
};

type ConsentFlags = Pick<Consent, "ad" | "analytics" | "tracking">;

type HostLayer = ConsentFlags & { updatedAt: number };

// `analytics` is absent by design: no OS exposes it, so it stays host-only.
type OsLayer = Pick<ConsentFlags, "ad" | "tracking"> & {
  source: "att" | "aaid-optout";
  updatedAt: number;
};

type StoredLayers = { host?: HostLayer; os?: OsLayer };

const FLAG_KEYS = ["ad", "analytics", "tracking"] as const;
const OS_FLAG_KEYS = ["ad", "tracking"] as const;
const OS_SOURCES: OsLayer["source"][] = ["att", "aaid-optout"];

let host: HostLayer | undefined;
// Persisted alongside the host layer: re-reading an unchanged ATT/AAID state on
// a later launch must not restamp updatedAt, which should keep pointing at when
// consent actually changed.
let os: OsLayer | undefined;

let storageRef: DetourStorage | null = null;
let hydrationPromise: Promise<void> | null = null;
// Set when a layer was written before storage was known, so hydration knows a
// flush is owed once it has a handle.
let writePending = false;

const readFlag = (source: Record<string, unknown>, key: string): boolean | undefined =>
  typeof source[key] === "boolean" ? (source[key] as boolean) : undefined;

const readTimestamp = (source: Record<string, unknown>): number =>
  typeof source.updatedAt === "number" ? source.updatedAt : 0;

const pickFlags = (source: Record<string, unknown>, keys: readonly string[]): ConsentFlags => {
  const flags: ConsentFlags = {};
  for (const key of keys) {
    const value = readFlag(source, key);
    if (value !== undefined) flags[key as keyof ConsentFlags] = value;
  }
  return flags;
};

const hasAnyFlag = (flags: ConsentFlags): boolean =>
  FLAG_KEYS.some((key) => flags[key] !== undefined);

const parseStored = (raw: string | null): StoredLayers => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    // Records written before the layer split are flat, with a single `source`
    // naming the side that produced them. Route those to that layer so an
    // existing install doesn't silently lose a consent choice on upgrade.
    if (!parsed.host && !parsed.os) {
      const flags = pickFlags(parsed, FLAG_KEYS);
      if (!hasAnyFlag(flags)) return {};

      const updatedAt = readTimestamp(parsed);
      const legacyOsSource = OS_SOURCES.find((candidate) => candidate === parsed.source);
      return legacyOsSource
        ? { os: { ad: flags.ad, tracking: flags.tracking, source: legacyOsSource, updatedAt } }
        : { host: { ...flags, updatedAt } };
    }

    const layers: StoredLayers = {};

    if (parsed.host && typeof parsed.host === "object") {
      const storedHost = parsed.host as Record<string, unknown>;
      const flags = pickFlags(storedHost, FLAG_KEYS);
      if (hasAnyFlag(flags)) layers.host = { ...flags, updatedAt: readTimestamp(storedHost) };
    }

    if (parsed.os && typeof parsed.os === "object") {
      const storedOs = parsed.os as Record<string, unknown>;
      const flags = pickFlags(storedOs, OS_FLAG_KEYS);
      const source = OS_SOURCES.find((candidate) => candidate === storedOs.source);
      if (source && hasAnyFlag(flags)) {
        layers.os = {
          ad: flags.ad,
          tracking: flags.tracking,
          source,
          updatedAt: readTimestamp(storedOs),
        };
      }
    }

    return layers;
  } catch {
    return {};
  }
};

const persist = (): void => {
  if (!storageRef) {
    writePending = true;
    return;
  }

  const payload: StoredLayers = {};
  if (host) payload.host = host;
  if (os) payload.os = os;

  try {
    Promise.resolve(storageRef.setItem(StorageKeys.CONSENT_KEY, JSON.stringify(payload))).catch(
      () => {
        // Best-effort — consent still applies for this session, it just won't
        // survive the next cold start.
      },
    );
  } catch {
    // Same as above, for storage impls that throw synchronously.
  }
};

// Idempotent and single-flight: safe to call from every entry point that reads
// consent. A layer written before hydration finished outranks the stored copy
// of that same layer — it's the fresher statement from the same source.
export const hydrateConsent = (storage: DetourStorage): Promise<void> => {
  if (hydrationPromise) return hydrationPromise;

  storageRef = storage;
  hydrationPromise = (async () => {
    let stored: StoredLayers = {};
    try {
      stored = parseStored(await storage.getItem(StorageKeys.CONSENT_KEY));
    } catch {
      stored = {};
    }

    if (!host && stored.host) host = stored.host;
    if (!os && stored.os) os = stored.os;

    if (writePending) {
      writePending = false;
      persist();
    }
  })();

  return hydrationPromise;
};

const sameFlags = (a: ConsentFlags, b: ConsentFlags): boolean =>
  FLAG_KEYS.every((key) => a[key] === b[key]);

// The host's statement of what the user chose in its own UI. Only keys carrying
// a real value take part — a `key: undefined` must not wipe an earlier choice.
export const setConsent = (update: Consent): void => {
  const next = { ...(host ?? {}), ...pickFlags(update as Record<string, unknown>, FLAG_KEYS) };
  if (host && sameFlags(host, next)) return;

  host = { ...next, updatedAt: Date.now() };
  persist();
};

// The device's own answer: ATT on iOS, ad-id opt-out on Android. Never merged
// into the host layer, so it can neither overwrite it nor be silenced by it.
export const applyOsConsent = (update: Pick<OsLayer, "ad" | "tracking" | "source">): void => {
  const next = {
    ...(os ?? {}),
    ...pickFlags(update as Record<string, unknown>, OS_FLAG_KEYS),
    source: update.source,
  };
  if (os && sameFlags(os, next) && os.source === next.source) return;

  os = { ...next, updatedAt: Date.now() };
  persist();
};

// Restrictive wins: with two opinions on a field, `false` decides. With one,
// that one stands. With none the field stays absent — "nobody asked" has to
// stay distinguishable from "the user said no".
const resolveFlag = (key: keyof ConsentFlags): boolean | undefined => {
  const hostValue = host?.[key];
  const osValue = key === "analytics" ? undefined : os?.[key];

  if (hostValue !== undefined && osValue !== undefined) return hostValue && osValue;
  return hostValue ?? osValue;
};

export const getConsent = (): Consent | undefined => {
  const flags: ConsentFlags = {};
  let fromHost = false;
  let fromOs = false;

  for (const key of FLAG_KEYS) {
    const resolved = resolveFlag(key);
    if (resolved === undefined) continue;

    flags[key] = resolved;
    if (host?.[key] !== undefined) fromHost = true;
    if (key !== "analytics" && os?.[key] !== undefined) fromOs = true;
  }

  if (!hasAnyFlag(flags)) return undefined;

  const resolveSource = (): ConsentSource => {
    if (fromHost && fromOs) return "mixed";
    if (fromHost) return "manual";
    return os?.source ?? "manual";
  };

  return {
    ...flags,
    source: resolveSource(),
    updatedAt: Math.max(fromHost ? (host?.updatedAt ?? 0) : 0, fromOs ? (os?.updatedAt ?? 0) : 0),
  };
};

// `false` is the only value that blocks. An absent flag means nobody has asked,
// which is the norm on Android's opt-out model outside the EEA — treating it as
// a refusal would cut off every host that has no consent UI at all.
export const isAdvertisingIdAllowed = (): boolean => getConsent()?.ad !== false;

export const isAnalyticsAllowed = (): boolean => getConsent()?.analytics !== false;
