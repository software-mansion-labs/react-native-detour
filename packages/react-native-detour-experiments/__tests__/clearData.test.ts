import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { clearExperimentsData } from "../src/runtime/clearData";
import {
  readCachedRemoteConfig,
  registerRemoteConfigStorage,
  remoteConfigStorageKey,
  resetRemoteConfigCacheForTests,
} from "../src/runtime/remoteConfigCache";
import {
  refreshRemoteConfig,
  resetRemoteConfigFetchForTests,
} from "../src/runtime/remoteConfigFetch";
import {
  DEVICE_ID_STORAGE_KEY,
  type StorageAdapter,
  resetDeviceIdForTests,
  resolveDeviceId,
  setDetourModuleForTests,
} from "../src/runtime/storage";

const DEVICE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const payload = {
  version: 2,
  updatedAt: "2026-11-10T00:00:00.000Z",
  experiments: {
    promo: {
      status: "running",
      enabled: true,
      rolloutPercent: 100,
      variants: ["A", "B"],
      winner: null,
    },
  },
  flags: {},
};

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const adapter: StorageAdapter = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
  return { items, adapter };
}

// A request that answers only when the test lets it.
function heldFetch() {
  let answer: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => {
    answer = resolve;
  });
  return {
    fetchImpl: (() => response) as unknown as typeof fetch,
    answer: () => answer(new Response(JSON.stringify(payload), { status: 200 })),
  };
}

describe("clearExperimentsData", () => {
  afterEach(() => {
    resetRemoteConfigCacheForTests();
    resetRemoteConfigFetchForTests();
    resetDeviceIdForTests();
  });

  test("a remote config fetch in flight does not store its config after the clear", async () => {
    const storage = memoryStorage();
    await registerRemoteConfigStorage(storage.adapter);
    const request = heldFetch();
    const refresh = refreshRemoteConfig({ fetchImpl: request.fetchImpl });

    const clearing = clearExperimentsData({ storage: storage.adapter });
    request.answer();
    await Promise.all([clearing, refresh]);

    assert.equal(readCachedRemoteConfig(), null);
    assert.equal(storage.items.has(remoteConfigStorageKey(undefined)), false);
  });

  test("a failed fetch in flight does not fail the clear", async () => {
    const storage = memoryStorage({ [remoteConfigStorageKey(undefined)]: JSON.stringify(payload) });
    const failing = (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
    const refresh = refreshRemoteConfig({ fetchImpl: failing });

    await clearExperimentsData({ storage: storage.adapter });
    await refresh;

    assert.equal(storage.items.has(remoteConfigStorageKey(undefined)), false);
  });

  test("with no fetch in flight, the cached config is dropped", async () => {
    const storage = memoryStorage();
    await registerRemoteConfigStorage(storage.adapter);
    await refreshRemoteConfig({
      fetchImpl: (async () =>
        new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch,
    });
    assert.equal(readCachedRemoteConfig()?.version, 2);

    await clearExperimentsData({ storage: storage.adapter });

    assert.equal(readCachedRemoteConfig(), null);
    assert.equal(storage.items.has(remoteConfigStorageKey(undefined)), false);
  });

  test("no Detour module: the device id this package created is removed", async () => {
    const storage = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: DEVICE_ID });
    setDetourModuleForTests(() => null);

    await clearExperimentsData({ storage: storage.adapter });

    assert.equal(storage.items.has(DEVICE_ID_STORAGE_KEY), false);
  });

  test("no Detour module, a storage without removeItem: the device id is emptied", async () => {
    const storage = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: DEVICE_ID });
    const { getItem, setItem } = storage.adapter;
    setDetourModuleForTests(() => null);

    await clearExperimentsData({ storage: { getItem, setItem } });

    assert.equal(storage.items.get(DEVICE_ID_STORAGE_KEY), "");
  });

  test("no Detour module: a device id load in flight does not store its id after the clear", async () => {
    const storage = memoryStorage();
    // The first launch reads an empty key, and the read answers only when the test lets it.
    let answerRead: () => void = () => {};
    const read = new Promise<void>((resolve) => {
      answerRead = resolve;
    });
    const slow: StorageAdapter = {
      ...storage.adapter,
      getItem: async (key) => {
        if (key === DEVICE_ID_STORAGE_KEY) await read;
        return storage.items.get(key) ?? null;
      },
    };
    setDetourModuleForTests(() => null);
    const loading = resolveDeviceId(slow);

    const clearing = clearExperimentsData({ storage: slow });
    for (let i = 0; i < 5; i += 1) await new Promise<void>((resolve) => setImmediate(resolve));
    answerRead();
    await Promise.all([clearing, loading]);

    assert.equal(storage.items.has(DEVICE_ID_STORAGE_KEY), false);
  });

  for (const [name, detourModule] of [
    ["Detour with the getter", { getDetourDeviceId: async () => DEVICE_ID }],
    ["Detour without the getter", {}],
  ] as const) {
    test(`${name}: the device id stays, as Detour owns it`, async () => {
      const storage = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: DEVICE_ID });
      setDetourModuleForTests(() => detourModule);

      await clearExperimentsData({ storage: storage.adapter });

      assert.equal(storage.items.get(DEVICE_ID_STORAGE_KEY), DEVICE_ID);
    });
  }
});
