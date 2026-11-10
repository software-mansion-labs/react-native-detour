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
