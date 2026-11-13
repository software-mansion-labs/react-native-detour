import type { ExperimentEvent } from "../types";
import { isDevRuntime } from "./environment";
import { type StorageAdapter, removeStoredItem } from "./storage";

export type OutboundEvent = ExperimentEvent & Record<string, unknown>;

// Do not rename: exposures already queued on a device are read back from this key.
export const OUTBOX_STORAGE_KEY = "detour-experiments:event_outbox";

export const MAX_BATCH_SIZE = 50;
export const MAX_QUEUE_SIZE = 500;
// The backend re-dates an event older than this to its arrival time, so it would count as current.
export const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60_000;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;
// A `Retry-After` may ask for more than the backoff cap, but not for longer than this.
const MAX_RETRY_AFTER_MS = 60 * 60_000;

export type OutboxTransportResult =
  | { ok: true; rejected?: { index: number; error: string }[] | undefined }
  | { ok: false; retryable: boolean; error: Error; retryAfterMs?: number | undefined };

type OutboxTransport<T> = (items: T[]) => Promise<OutboxTransportResult>;

type CancelScheduled = () => void;

type OutboxOptions<T> = {
  transport: OutboxTransport<T>;
  storage?: StorageAdapter | undefined;
  storageKey?: string | undefined;
  batchSize?: number | undefined;
  keep?: ((stored: unknown) => boolean) | undefined;
  // When the event happened, in ms since the epoch. An item without one never expires.
  timestampOf?: ((item: T) => number | undefined) | undefined;
  onSuccess?: ((item: T) => void) | undefined;
  onError?: ((error: Error, item: T) => void) | undefined;
  scheduler?: ((run: () => void, delayMs: number) => CancelScheduled | void) | undefined;
  now?: (() => number) | undefined;
};

export type EventOutbox<T = OutboundEvent> = {
  enqueue: (item: T) => void;
  flush: () => Promise<void>;
  droppedCount: () => number;
  pendingCount: () => number;
  // Cancels the retry and sends nothing more. The stored queue stays for the next launch.
  stop: () => void;
  // Undoes `stop`.
  resume: () => void;
  // Drops every pending item, in memory and in storage, and cancels the retry.
  clear: () => Promise<void>;
};

// Every outbox that has not been stopped, so stored data can be cleared from outside a provider.
const liveOutboxes = new Set<EventOutbox<never>>();

export function clearLiveOutboxes(): Promise<void> {
  return Promise.all([...liveOutboxes].map((outbox) => outbox.clear())).then(() => {});
}

// A 4xx other than 408 and 429 means the payload itself is wrong, so resending cannot help.
export function statusIsRetryable(status: number): boolean {
  if (status === 408 || status === 429) return true;
  return status < 400 || status >= 500;
}

// `Retry-After` is either a number of seconds or an HTTP date.
export function parseRetryAfter(
  header: string | null | undefined,
  now = Date.now(),
): number | undefined {
  const value = header?.trim();
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

export function createEventOutbox<T extends object = OutboundEvent>(
  options: OutboxOptions<T>,
): EventOutbox<T> {
  const storageKey = options.storageKey ?? OUTBOX_STORAGE_KEY;
  const batchSize = options.batchSize ?? MAX_BATCH_SIZE;
  const now = options.now ?? Date.now;
  const schedule =
    options.scheduler ??
    ((run: () => void, delayMs: number): CancelScheduled => {
      const timer = setTimeout(run, delayMs);
      return () => clearTimeout(timer);
    });

  let queue: T[] = [];
  let dropped = 0;
  let hydrated = false;
  let stopped = false;
  let clears = 0;
  let inFlight: Promise<void> | null = null;
  let consecutiveFailures = 0;
  // While a retry is scheduled, nothing else sends: a new event or a foreground only persists.
  let retryAt: number | null = null;
  let cancelRetry: CancelScheduled | null = null;

  function isFresh(item: T): boolean {
    const timestamp = options.timestampOf?.(item);
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return true;
    return now() - timestamp <= MAX_EVENT_AGE_MS;
  }

  function dropExpired(): void {
    const fresh = queue.filter(isFresh);
    if (fresh.length === queue.length) return;
    dropped += queue.length - fresh.length;
    queue = fresh;
    persist();
  }

  // Writes nothing before the stored queue is read back, or it would overwrite the last backlog.
  function persist(): void {
    const storage = options.storage;
    if (!storage || !hydrated || stopped) return;
    // Storage full or unavailable: the in-memory queue still works for this session.
    try {
      Promise.resolve(storage.setItem(storageKey, JSON.stringify(queue))).catch(() => {});
    } catch {
      // The same, for a storage that throws instead of rejecting.
    }
  }

  // A callback of the app that throws must not stop the drain, or no retry would be scheduled.
  function report(callback: () => void): void {
    try {
      callback();
    } catch (error) {
      if (isDevRuntime()) {
        console.warn(
          `[Detour Experiments] An event callback threw: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async function readStoredQueue(): Promise<void> {
    const storage = options.storage;
    if (!storage) {
      hydrated = true;
      return;
    }
    const clearsBefore = clears;
    try {
      const raw = await storage.getItem(storageKey);
      if (typeof raw === "string" && raw && clears === clearsBefore) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const keep = options.keep;
          const stored = (keep ? parsed.filter((entry) => keep(entry)) : parsed) as T[];
          queue = [...stored, ...queue].slice(-MAX_QUEUE_SIZE);
        }
      }
    } catch {
      // Corrupt outbox: discard it rather than blocking every future send.
    }
    hydrated = true;
    dropExpired();
    persist();
  }

  const hydration: Promise<void> = readStoredQueue();

  function cancelScheduledRetry(): void {
    cancelRetry?.();
    cancelRetry = null;
    retryAt = null;
  }

  function scheduleRetry(retryAfterMs: number | undefined): void {
    cancelScheduledRetry();
    const backoff = Math.min(
      MAX_RETRY_MS,
      BASE_RETRY_MS * Math.pow(2, Math.max(0, consecutiveFailures - 1)),
    );
    const delay = Math.min(Math.max(backoff, retryAfterMs ?? 0), MAX_RETRY_AFTER_MS);
    retryAt = now() + delay;
    cancelRetry =
      schedule(() => {
        cancelRetry = null;
        retryAt = null;
        flush();
      }, delay) ?? null;
  }

  async function drain(): Promise<void> {
    await hydration;

    while (!stopped) {
      dropExpired();
      if (queue.length === 0) return;
      const batch = queue.slice(0, batchSize);
      const clearsAtSend = clears;
      const result = await options.transport(batch);
      if (stopped) return;

      // By identity: `clear` or the size limit may have removed items while the batch was out.
      const sent = new Set<T>(batch);
      queue = queue.filter((item) => !sent.has(item));

      if (result.ok) {
        persist();
        consecutiveFailures = 0;
        const rejections = new Map<number, string>();
        for (const { index, error } of result.rejected ?? []) rejections.set(index, error);
        batch.forEach((item, index) => {
          const error = rejections.get(index);
          if (error === undefined) report(() => options.onSuccess?.(item));
          else report(() => options.onError?.(new Error(error), item));
        });
        continue;
      }

      for (const item of batch) report(() => options.onError?.(result.error, item));

      if (!result.retryable) {
        persist();
        continue;
      }

      // Back in front, in the order they were sent, unless the queue was cleared meanwhile.
      if (clears === clearsAtSend) queue = [...batch, ...queue].slice(-MAX_QUEUE_SIZE);
      consecutiveFailures += 1;
      persist();
      scheduleRetry(result.retryAfterMs);
      return;
    }
  }

  function flush(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (inFlight) return inFlight;
    if (retryAt !== null) {
      // The timer may be late after a stay in the background, so a due retry runs now.
      if (now() < retryAt) return Promise.resolve();
      cancelScheduledRetry();
    }
    inFlight = drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  const outbox: EventOutbox<T> = {
    enqueue(item: T) {
      if (stopped) return;
      queue.push(item);
      if (queue.length > MAX_QUEUE_SIZE) {
        dropped += queue.length - MAX_QUEUE_SIZE;
        queue = queue.slice(-MAX_QUEUE_SIZE);
      }
      persist();
      flush();
    },
    flush,
    droppedCount: () => dropped,
    pendingCount: () => queue.length,
    stop() {
      if (stopped) return;
      stopped = true;
      cancelScheduledRetry();
      liveOutboxes.delete(outbox as EventOutbox<never>);
    },
    resume() {
      if (!stopped) return;
      stopped = false;
      liveOutboxes.add(outbox as EventOutbox<never>);
    },
    async clear() {
      clears += 1;
      queue = [];
      consecutiveFailures = 0;
      cancelScheduledRetry();
      if (options.storage) await removeStoredItem(options.storage, storageKey, "[]");
    },
  };

  liveOutboxes.add(outbox as EventOutbox<never>);
  return outbox;
}
