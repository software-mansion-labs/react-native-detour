import type { RemoteConfigPayload } from "../remoteConfig";
import type { DeviceAttributes } from "./deviceAttributes";

/**
 * What assignments are made from for one launch. Taken once and never updated, so a variant or a flag
 * cannot change in front of the user. A config fetched later is stored for the next launch.
 */
export type Session = {
  /** `null` when storage never answered: every rule that needs a bucket is held on control. */
  deviceId: string | null;
  /** `null` when the device had no cached config and the first fetch did not arrive in time. */
  remoteConfig: RemoteConfigPayload | null;
  /**
   * What a rule's audience is matched against, and what every exposure of the
   * launch carries: the same object, so the two cannot disagree.
   */
  attributes: DeviceAttributes;
};

export type SessionReadiness = {
  /** The device id has been read from storage. */
  deviceIdRead: boolean;
  /** The cached config has been read from storage, whether or not there was one. */
  configRead: boolean;
  hasConfig: boolean;
  /** The first fetch has finished, successfully or not. */
  fetchSettled: boolean;
  /** `firstLaunchTimeoutMs` has passed since the launch started. */
  firstLaunchBudgetElapsed: boolean;
  /** `refreshTimeoutMs` has passed since the launch started; true from the start when it is `0`. */
  refreshBudgetElapsed: boolean;
  /** Storage has had {@link STORAGE_DEADLINE_MS} to answer. */
  storageDeadlineElapsed: boolean;
};

/**
 * How long storage gets to answer before the session starts without it.
 * Only a storage that hangs reaches this.
 */
export const STORAGE_DEADLINE_MS = 3000;

/** How long a first launch waits for its first config before going without one. */
export const DEFAULT_FIRST_LAUNCH_TIMEOUT_MS = 400;

/** A launch with a cached config decides from it at once unless the app asks to wait for a fresh one. */
export const DEFAULT_REFRESH_TIMEOUT_MS = 0;

/**
 * The longest a launch may wait for the network, whatever the app asks for.
 * Without a cap, a large budget and a fetch that hangs would be a splash screen that stays.
 */
export const MAX_NETWORK_WAIT_MS = 10_000;

function networkWaitMs(requested: number | undefined, fallback: number): number {
  if (requested === undefined || Number.isNaN(requested)) return fallback;
  return Math.min(Math.max(0, requested), MAX_NETWORK_WAIT_MS);
}

/** The provider's `firstLaunchTimeoutMs` as a wait that is safe to honour. */
export function firstLaunchBudgetMs(requested: number | undefined): number {
  return networkWaitMs(requested, DEFAULT_FIRST_LAUNCH_TIMEOUT_MS);
}

/** The provider's `refreshTimeoutMs` as a wait that is safe to honour. */
export function refreshBudgetMs(requested: number | undefined): number {
  return networkWaitMs(requested, DEFAULT_REFRESH_TIMEOUT_MS);
}

/**
 * The two local reads come first, and only the storage deadline cuts them short. Then the launch waits
 * for the first fetch: `refreshTimeoutMs` with a cached config, `firstLaunchTimeoutMs` without one.
 */
export function isSessionReady(readiness: SessionReadiness): boolean {
  if (!readiness.deviceIdRead || !readiness.configRead) {
    return readiness.storageDeadlineElapsed;
  }
  if (readiness.fetchSettled) return true;
  return readiness.hasConfig ? readiness.refreshBudgetElapsed : readiness.firstLaunchBudgetElapsed;
}

/**
 * Process-wide, so a provider mounted later in the same launch gets the same assignments.
 * A server never has one: one process would hand it to every request.
 */
let session: Session | null = null;
const listeners = new Set<() => void>();
let sessionStarted: Promise<void> | null = null;
let resolveSessionStarted: (() => void) | null = null;

export function readSession(): Session | null {
  return session;
}

/**
 * Resolves when the session starts, whoever starts it. A hook suspends on this, so it must be the
 * same promise on every call: React retries on the one it was given.
 */
export function whenSessionStarts(): Promise<void> {
  sessionStarted ??= new Promise<void>((resolve) => {
    if (session !== null) resolve();
    else resolveSessionStarted = resolve;
  });
  return sessionStarted;
}

/** Hears when the session starts, so every mounted provider joins it at once. */
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Starts the session, or returns the one already started: the first caller wins. */
export function startSession(next: Session): Session {
  if (session === null) {
    session = next;
    for (const listener of [...listeners]) listener();
    resolveSessionStarted?.();
    resolveSessionStarted = null;
  }
  return session;
}

/** Exported for tests: clears the process-wide session. */
const sentExposures = new Set<string>();

/** The exposures this launch has passed on. Process-wide, so a provider that mounts again shares it. */
export function sentExposuresOfLaunch(): Set<string> {
  return sentExposures;
}

export function resetSessionForTests(): void {
  sentExposures.clear();
  session = null;
  sessionStarted = null;
  resolveSessionStarted = null;
}
