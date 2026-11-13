import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { type OutboxTransportResult, createEventOutbox } from "../src/runtime/eventOutbox";

type Item = { id: number };

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await tick();
}

describe("createEventOutbox", () => {
  let unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };

  beforeEach(() => {
    unhandled = [];
    process.on("unhandledRejection", onUnhandled);
  });

  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
  });

  test("sends an event and empties the stored queue", async () => {
    const stored = new Map<string, string>();
    const sent: Item[][] = [];
    const outbox = createEventOutbox<Item>({
      storageKey: "outbox",
      storage: {
        getItem: async (key) => stored.get(key) ?? null,
        setItem: async (key, value) => {
          stored.set(key, value);
        },
      },
      transport: async (items) => {
        sent.push(items);
        return { ok: true };
      },
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();

    assert.deepEqual(sent, [[{ id: 1 }]]);
    assert.equal(outbox.pendingCount(), 0);
    assert.equal(stored.get("outbox"), "[]");
  });

  test("reads the stored backlog back before it sends", async () => {
    const sent: Item[][] = [];
    const outbox = createEventOutbox<Item>({
      storageKey: "outbox",
      storage: {
        getItem: async () => JSON.stringify([{ id: 1 }, { id: 2 }]),
        setItem: async () => {},
      },
      transport: async (items) => {
        sent.push(items);
        return { ok: true };
      },
    });

    outbox.enqueue({ id: 3 });
    await outbox.flush();

    assert.deepEqual(sent, [[{ id: 1 }, { id: 2 }, { id: 3 }]]);
  });

  test("a storage that rejects a write leaves no unhandled rejection", async () => {
    const sent: Item[][] = [];
    const outbox = createEventOutbox<Item>({
      storageKey: "outbox",
      storage: {
        getItem: async () => null,
        setItem: async () => {
          throw new Error("disk full");
        },
      },
      transport: async (items) => {
        sent.push(items);
        return { ok: true };
      },
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    await settle();

    assert.deepEqual(sent, [[{ id: 1 }]]);
    assert.deepEqual(unhandled, []);
  });

  test("an onError that throws still leaves a retry scheduled", async () => {
    const retries: (() => void)[] = [];
    let online = false;
    const sent: Item[][] = [];
    const outbox = createEventOutbox<Item>({
      transport: async (items): Promise<OutboxTransportResult> => {
        if (!online) return { ok: false, retryable: true, error: new Error("offline") };
        sent.push(items);
        return { ok: true };
      },
      onError: () => {
        throw new Error("the app's callback threw");
      },
      scheduler: (run) => {
        retries.push(run);
      },
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    await settle();

    assert.equal(retries.length, 1);
    assert.equal(outbox.pendingCount(), 1);
    assert.deepEqual(unhandled, []);

    online = true;
    retries[0]?.();
    await outbox.flush();

    assert.deepEqual(sent, [[{ id: 1 }]]);
    assert.equal(outbox.pendingCount(), 0);
  });

  test("an onSuccess that throws does not stop the next batch", async () => {
    const sent: Item[][] = [];
    const outbox = createEventOutbox<Item>({
      batchSize: 1,
      transport: async (items) => {
        sent.push(items);
        return { ok: true };
      },
      onSuccess: () => {
        throw new Error("the app's callback threw");
      },
    });

    outbox.enqueue({ id: 1 });
    outbox.enqueue({ id: 2 });
    await outbox.flush();
    await settle();

    assert.deepEqual(sent, [[{ id: 1 }], [{ id: 2 }]]);
    assert.deepEqual(unhandled, []);
  });

  test("a 4xx answer drops the batch and a 5xx answer keeps it", async () => {
    const retries: (() => void)[] = [];
    let result: OutboxTransportResult = {
      ok: false,
      retryable: false,
      error: new Error("Failed with status 400"),
    };
    const outbox = createEventOutbox<Item>({
      transport: async () => result,
      scheduler: (run) => {
        retries.push(run);
      },
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    assert.equal(outbox.pendingCount(), 0);
    assert.equal(retries.length, 0);

    result = { ok: false, retryable: true, error: new Error("Failed with status 503") };
    outbox.enqueue({ id: 2 });
    await outbox.flush();
    assert.equal(outbox.pendingCount(), 1);
    assert.equal(retries.length, 1);
  });
});

describe("createEventOutbox backoff and lifetime", () => {
  type Scheduled = { run: () => void; delayMs: number; cancelled: boolean };

  function fakeScheduler() {
    const scheduled: Scheduled[] = [];
    return {
      scheduled,
      scheduler: (run: () => void, delayMs: number) => {
        const entry: Scheduled = { run, delayMs, cancelled: false };
        scheduled.push(entry);
        return () => {
          entry.cancelled = true;
        };
      },
    };
  }

  test("a new event or a flush only persists while a retry is scheduled", async () => {
    const { scheduled, scheduler } = fakeScheduler();
    const stored = new Map<string, string>();
    let calls = 0;
    const outbox = createEventOutbox<Item>({
      storageKey: "outbox",
      storage: {
        getItem: async (key) => stored.get(key) ?? null,
        setItem: async (key, value) => {
          stored.set(key, value);
        },
      },
      transport: async () => {
        calls += 1;
        return { ok: false, retryable: true, error: new Error("Failed with status 429") };
      },
      scheduler,
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    assert.equal(calls, 1);
    assert.equal(scheduled.length, 1);

    outbox.enqueue({ id: 2 });
    await outbox.flush();
    await settle();

    assert.equal(calls, 1);
    assert.equal(outbox.pendingCount(), 2);
    assert.deepEqual(JSON.parse(stored.get("outbox") ?? "[]"), [{ id: 1 }, { id: 2 }]);
  });

  test("waits at least as long as Retry-After asks", async () => {
    const { scheduled, scheduler } = fakeScheduler();
    const outbox = createEventOutbox<Item>({
      transport: async () => ({
        ok: false,
        retryable: true,
        error: new Error("Failed with status 429"),
        retryAfterMs: 90_000,
      }),
      scheduler,
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();

    assert.equal(scheduled[0]?.delayMs, 90_000);
  });

  test("a retry that is due runs on the next flush", async () => {
    const { scheduled, scheduler } = fakeScheduler();
    let clock = 0;
    let online = false;
    const outbox = createEventOutbox<Item>({
      transport: async (): Promise<OutboxTransportResult> =>
        online ? { ok: true } : { ok: false, retryable: true, error: new Error("offline") },
      scheduler,
      now: () => clock,
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    online = true;
    clock = (scheduled[0]?.delayMs ?? 0) + 1;
    await outbox.flush();

    assert.equal(outbox.pendingCount(), 0);
    assert.equal(scheduled[0]?.cancelled, true);
  });

  test("stop cancels the retry and sends nothing more", async () => {
    const { scheduled, scheduler } = fakeScheduler();
    let calls = 0;
    const outbox = createEventOutbox<Item>({
      transport: async () => {
        calls += 1;
        return { ok: false, retryable: true, error: new Error("offline") };
      },
      scheduler,
    });

    outbox.enqueue({ id: 1 });
    await outbox.flush();
    outbox.stop();
    scheduled[0]?.run();
    outbox.enqueue({ id: 2 });
    await outbox.flush();

    assert.equal(scheduled[0]?.cancelled, true);
    assert.equal(calls, 1);
  });

  test("clear drops the queue in memory and in storage", async () => {
    const stored = new Map<string, string>([["outbox", JSON.stringify([{ id: 1 }])]]);
    const outbox = createEventOutbox<Item>({
      storageKey: "outbox",
      storage: {
        getItem: async (key) => stored.get(key) ?? null,
        setItem: async (key, value) => {
          stored.set(key, value);
        },
        removeItem: async (key) => {
          stored.delete(key);
        },
      },
      transport: async () => ({ ok: false, retryable: true, error: new Error("offline") }),
      scheduler: () => {},
    });

    await outbox.flush();
    await outbox.clear();

    assert.equal(outbox.pendingCount(), 0);
    assert.equal(stored.has("outbox"), false);
  });

  test("drops an event older than seven days", async () => {
    const day = 24 * 60 * 60_000;
    const sent: { id: number; at: number }[][] = [];
    const outbox = createEventOutbox<{ id: number; at: number }>({
      storage: {
        getItem: async () => JSON.stringify([{ id: 1, at: 0 }]),
        setItem: async () => {},
      },
      transport: async (items) => {
        sent.push(items);
        return { ok: true };
      },
      timestampOf: (item) => item.at,
      now: () => 8 * day,
    });

    outbox.enqueue({ id: 2, at: 7 * day });
    await outbox.flush();

    assert.deepEqual(sent, [[{ id: 2, at: 7 * day }]]);
    assert.equal(outbox.droppedCount(), 1);
  });
});
