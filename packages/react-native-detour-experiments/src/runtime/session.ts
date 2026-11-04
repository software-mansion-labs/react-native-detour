import type { RemoteConfigPayload } from "../remoteConfig";
import type { DeviceAttributes } from "./deviceAttributes";

// Taken once and never updated, so a variant or flag cannot change in front of the user.
export type Session = {
  deviceId: string | null;
  remoteConfig: RemoteConfigPayload | null;
  attributes: DeviceAttributes;
};

export type SessionReadiness = {
  deviceIdRead: boolean;
  configRead: boolean;
  hasConfig: boolean;
  fetchSettled: boolean;
  firstLaunchBudgetElapsed: boolean;
  refreshBudgetElapsed: boolean;
  storageDeadlineElapsed: boolean;
};

export const STORAGE_DEADLINE_MS = 3000;

export const DEFAULT_FIRST_LAUNCH_TIMEOUT_MS = 400;

export const DEFAULT_REFRESH_TIMEOUT_MS = 0;

// Without a cap, a large budget and a hanging fetch would leave the splash screen up for good.
export const MAX_NETWORK_WAIT_MS = 10_000;

function networkWaitMs(requested: number | undefined, fallback: number): number {
  if (requested === undefined || Number.isNaN(requested)) return fallback;
  return Math.min(Math.max(0, requested), MAX_NETWORK_WAIT_MS);
}

export function firstLaunchBudgetMs(requested: number | undefined): number {
  return networkWaitMs(requested, DEFAULT_FIRST_LAUNCH_TIMEOUT_MS);
}

export function refreshBudgetMs(requested: number | undefined): number {
  return networkWaitMs(requested, DEFAULT_REFRESH_TIMEOUT_MS);
}

// The two local reads come first, cut short only by the storage deadline. Then the launch waits for
// the first fetch: `refreshTimeoutMs` with a cached config, `firstLaunchTimeoutMs` without one.
export function isSessionReady(readiness: SessionReadiness): boolean {
  if (!readiness.deviceIdRead || !readiness.configRead) {
    return readiness.storageDeadlineElapsed;
  }
  if (readiness.fetchSettled) return true;
  return readiness.hasConfig ? readiness.refreshBudgetElapsed : readiness.firstLaunchBudgetElapsed;
}

// Process-wide, so a provider mounted later in the same launch gets the same assignments.
let session: Session | null = null;
const listeners = new Set<() => void>();
const sentExposures = new Set<string>();
let sessionStarted: Promise<void> | null = null;
let resolveSessionStarted: (() => void) | null = null;

export function readSession(): Session | null {
  return session;
}

// Must be the same promise on every call: React retries on the one it was given.
export function whenSessionStarts(): Promise<void> {
  sessionStarted ??= new Promise<void>((resolve) => {
    if (session !== null) resolve();
    else resolveSessionStarted = resolve;
  });
  return sessionStarted;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The first caller wins.
export function startSession(next: Session): Session {
  if (session === null) {
    session = next;
    for (const listener of [...listeners]) listener();
    resolveSessionStarted?.();
    resolveSessionStarted = null;
  }
  return session;
}

export function sentExposuresOfLaunch(): Set<string> {
  return sentExposures;
}

export function resetSessionForTests(): void {
  sentExposures.clear();
  session = null;
  sessionStarted = null;
  resolveSessionStarted = null;
}
