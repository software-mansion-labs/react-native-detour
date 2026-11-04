import type { ExperimentEvent } from "../types";
import type { StorageAdapter } from "./storage";

export type OutboundEvent = ExperimentEvent & Record<string, unknown>;

// Do not rename: exposures already queued on a device are read back from this key.
export const OUTBOX_STORAGE_KEY = "detour-experiments:event_outbox";

export const MAX_BATCH_SIZE = 50;
export const MAX_QUEUE_SIZE = 500;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;

export type OutboxTransportResult =
  | { ok: true; rejected?: { index: number; error: string }[] | undefined }
  | { ok: false; retryable: boolean; error: Error };

type OutboxTransport<T> = (items: T[]) => Promise<OutboxTransportResult>;

type OutboxOptions<T> = {
  transport: OutboxTransport<T>;
  storage?: StorageAdapter | undefined;
  storageKey?: string | undefined;
  batchSize?: number | undefined;
  keep?: ((stored: unknown) => boolean) | undefined;
  onSuccess?: ((item: T) => void) | undefined;
  onError?: ((error: Error, item: T) => void) | undefined;
  scheduler?: ((run: () => void, delayMs: number) => void) | undefined;
};

export type EventOutbox<T = OutboundEvent> = {
  enqueue: (item: T) => void;
  flush: () => Promise<void>;
  droppedCount: () => number;
  pendingCount: () => number;
};

// A 4xx other than 408 and 429 means the payload itself is wrong, so resending cannot help.
export function statusIsRetryable(status: number): boolean {
  if (status === 408 || status === 429) return true;
  return status < 400 || status >= 500;
}

export function createEventOutbox<T extends object = OutboundEvent>(
  options: OutboxOptions<T>,
): EventOutbox<T> {
  const storageKey = options.storageKey ?? OUTBOX_STORAGE_KEY;
  const batchSize = options.batchSize ?? MAX_BATCH_SIZE;
  const schedule =
    options.scheduler ??
    ((run: () => void, delayMs: number) => {
      setTimeout(run, delayMs);
    });

  let queue: T[] = [];
  let dropped = 0;
  let hydrated = false;
  let inFlight: Promise<void> | null = null;
  let retryScheduled = false;
  let consecutiveFailures = 0;

  // Writes nothing before the stored queue is read back, or it would overwrite the last backlog.
  function persist(): void {
    const storage = options.storage;
    if (!storage || !hydrated) return;
    try {
      Promise.resolve(storage.setItem(storageKey, JSON.stringify(queue)));
    } catch {
      // Storage full or unavailable: the in-memory queue still works for this session.
    }
  }

  async function readStoredQueue(): Promise<void> {
    const storage = options.storage;
    if (!storage) {
      hydrated = true;
      return;
    }
    try {
      const raw = await storage.getItem(storageKey);
      if (typeof raw === "string" && raw) {
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
    persist();
  }

  const hydration: Promise<void> = readStoredQueue();

  function scheduleRetry(): void {
    if (retryScheduled) return;
    retryScheduled = true;
    const delay = Math.min(
      MAX_RETRY_MS,
      BASE_RETRY_MS * Math.pow(2, Math.max(0, consecutiveFailures - 1)),
    );
    schedule(() => {
      retryScheduled = false;
      flush();
    }, delay);
  }

  async function drain(): Promise<void> {
    await hydration;

    while (queue.length > 0) {
      const batch = queue.slice(0, batchSize);
      const result = await options.transport(batch);

      if (result.ok) {
        queue = queue.slice(batch.length);
        persist();
        consecutiveFailures = 0;
        const rejections = new Map<number, string>();
        for (const { index, error } of result.rejected ?? []) rejections.set(index, error);
        batch.forEach((item, index) => {
          const error = rejections.get(index);
          if (error === undefined) options.onSuccess?.(item);
          else options.onError?.(new Error(error), item);
        });
        continue;
      }

      for (const item of batch) options.onError?.(result.error, item);

      if (!result.retryable) {
        queue = queue.slice(batch.length);
        persist();
        continue;
      }

      consecutiveFailures += 1;
      persist();
      scheduleRetry();
      return;
    }
  }

  function flush(): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    enqueue(item: T) {
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
  };
}
