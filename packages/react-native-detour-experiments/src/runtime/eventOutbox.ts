import type { ExperimentEvent } from "../types";
import type { StorageAdapter } from "./resolveStorage";

/**
 * An event as it goes over the wire: the typed event plus whatever OTA and
 * caller-supplied context was merged onto it.
 */
export type OutboundEvent = ExperimentEvent & Record<string, unknown>;

/** The exposures queue. Do not rename it: exposures already queued on a device are read back from it. */
export const OUTBOX_STORAGE_KEY = "detour-experiments:event_outbox";

/** Default events per HTTP request: the most the exposures endpoint takes in one `{ events: [...] }`. */
export const MAX_BATCH_SIZE = 50;
/** Ceiling on the queue. Past it the oldest events are dropped: the newest are the ones worth having. */
export const MAX_QUEUE_SIZE = 500;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;

export type OutboxTransportResult =
  /**
   * The request went through. `rejected` lists, by index into the batch, the
   * items the server refused one by one; they are reported, never resent.
   */
  | { ok: true; rejected?: { index: number; error: string }[] | undefined }
  /** `retryable: false` means the server rejected the payload; retrying cannot help. */
  | { ok: false; retryable: boolean; error: Error };

type OutboxTransport<T> = (items: T[]) => Promise<OutboxTransportResult>;

type OutboxOptions<T> = {
  transport: OutboxTransport<T>;
  storage?: StorageAdapter | undefined;
  /** Separate keys keep separate queues from overwriting each other. */
  storageKey?: string | undefined;
  /** Items per request; defaults to {@link MAX_BATCH_SIZE}. */
  batchSize?: number | undefined;
  /**
   * Whether an entry read back from storage is still worth sending. One an older build queued in a
   * shape the server now refuses is left behind, instead of being sent and refused.
   */
  keep?: ((stored: unknown) => boolean) | undefined;
  onSuccess?: ((item: T) => void) | undefined;
  onError?: ((error: Error, item: T) => void) | undefined;
  /** Injected in tests so retry backoff does not consume real time. */
  scheduler?: ((run: () => void, delayMs: number) => void) | undefined;
};

export type EventOutbox<T = OutboundEvent> = {
  enqueue: (item: T) => void;
  /** Sends everything queued. Safe to call at any time; concurrent calls coalesce. */
  flush: () => Promise<void>;
  /** Number of events dropped because the queue was full. */
  droppedCount: () => number;
  pendingCount: () => number;
};

/** A 4xx other than 408 and 429 means the payload itself is wrong, so resending it cannot help. */
function isRetryable(status: number): boolean {
  if (status === 408 || status === 429) return true;
  return status < 400 || status >= 500;
}

export function statusIsRetryable(status: number): boolean {
  return isRetryable(status);
}

/**
 * A durable, batched queue for analytics events: what is logged offline arrives after reconnecting.
 * An item is what the caller queues. The transport builds the request body from it.
 */
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

  /** Writes nothing before the stored queue is read back: that would overwrite the last session's backlog. */
  function persist(): void {
    const storage = options.storage;
    if (!storage || !hydrated) return;
    try {
      Promise.resolve(storage.setItem(storageKey, JSON.stringify(queue)));
    } catch {
      // Storage full or unavailable: the in-memory queue still works for this session.
    }
  }

  /** Events restored from the last session are older, so they go first. */
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

  /** A batch the server will never accept is dropped, so it does not block everything queued behind it. */
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
