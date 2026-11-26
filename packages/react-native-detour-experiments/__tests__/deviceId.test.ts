import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  DEVICE_ID_STORAGE_KEY,
  type StorageAdapter,
  loadDeviceId,
  peekDeviceId,
  resetDeviceIdForTests,
  resolveDeviceId,
  setDetourModuleForTests,
} from "../src/runtime/storage";

const DETOUR_ID = "0b0b0b0b-1111-4222-8333-444444444444";
const STORED_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const writes: [key: string, value: string][] = [];
  const adapter: StorageAdapter = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push([key, value]);
      items.set(key, value);
    },
  };
  return { items, writes, adapter };
}

const detourAbsent = () => null;
const detourWithoutGetter = () => ({});
const detourWithGetter = (getDetourDeviceId: (storage?: StorageAdapter) => Promise<string>) => {
  return () => ({ getDetourDeviceId });
};

describe("loadDeviceId", () => {
  const dev = globalThis as { __DEV__?: boolean };
  const realWarn = console.warn;
  let warnings: string[] = [];

  beforeEach(() => {
    warnings = [];
    dev.__DEV__ = true;
    console.warn = (message: unknown) => {
      warnings.push(String(message));
    };
  });

  afterEach(() => {
    console.warn = realWarn;
    delete dev.__DEV__;
    resetDeviceIdForTests();
  });

  test("Detour with the getter: uses its id and writes nothing", async () => {
    const storage = memoryStorage();
    const received: (StorageAdapter | undefined)[] = [];
    setDetourModuleForTests(
      detourWithGetter(async (given) => {
        received.push(given);
        return DETOUR_ID.toUpperCase();
      }),
    );

    const loaded = await loadDeviceId(storage.adapter);

    assert.deepEqual(loaded, { id: DETOUR_ID, persisted: true });
    assert.deepEqual(received, [storage.adapter]);
    assert.deepEqual(storage.writes, []);
    assert.deepEqual(warnings, []);
  });

  test("Detour with the getter and no valid id: an id in memory, nothing written", async () => {
    const storage = memoryStorage();
    setDetourModuleForTests(detourWithGetter(async () => "not-a-guid"));

    const loaded = await loadDeviceId(storage.adapter);

    assert.equal(loaded.persisted, false);
    assert.match(loaded.id, GUID);
    assert.deepEqual(storage.writes, []);
  });

  test("Detour without the getter, first launch: the key is left for Detour to write", async () => {
    const storage = memoryStorage();
    setDetourModuleForTests(detourWithoutGetter);

    const loaded = await loadDeviceId(storage.adapter);
    // The older Detour SDK read the empty key at the same time, and writes its own id.
    storage.items.set(DEVICE_ID_STORAGE_KEY, DETOUR_ID);

    assert.equal(loaded.persisted, false);
    assert.match(loaded.id, GUID);
    assert.notEqual(loaded.id, DETOUR_ID);
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.items.get(DEVICE_ID_STORAGE_KEY), DETOUR_ID);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Update @swmansion\/react-native-detour to 2\.6\.0 or newer/);

    // The next launch reads the id Detour stored.
    resetDeviceIdForTests();
    setDetourModuleForTests(detourWithoutGetter);
    assert.deepEqual(await loadDeviceId(storage.adapter), { id: DETOUR_ID, persisted: true });
  });

  test("Detour without the getter, a stored id: reads it and writes nothing", async () => {
    const storage = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: STORED_ID });
    setDetourModuleForTests(detourWithoutGetter);

    const loaded = await loadDeviceId(storage.adapter);

    assert.deepEqual(loaded, { id: STORED_ID, persisted: true });
    assert.deepEqual(storage.writes, []);
    assert.deepEqual(warnings, []);
  });

  test("no Detour module, first launch: generates the id and stores it", async () => {
    const storage = memoryStorage();
    setDetourModuleForTests(detourAbsent);

    const loaded = await loadDeviceId(storage.adapter);

    assert.equal(loaded.persisted, true);
    assert.match(loaded.id, GUID);
    assert.deepEqual(storage.writes, [[DEVICE_ID_STORAGE_KEY, loaded.id]]);
    assert.deepEqual(await loadDeviceId(storage.adapter), loaded);
    assert.equal(storage.writes.length, 1);
    assert.deepEqual(warnings, []);
  });

  test("no Detour module, a stored id: reads it and writes nothing", async () => {
    const storage = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: STORED_ID.toUpperCase() });
    setDetourModuleForTests(detourAbsent);

    const loaded = await loadDeviceId(storage.adapter);

    assert.deepEqual(loaded, { id: STORED_ID, persisted: true });
    assert.deepEqual(storage.writes, []);
  });

  test("an id that lives in memory is not peeked", async () => {
    const storage = memoryStorage();
    setDetourModuleForTests(detourWithoutGetter);

    const id = await resolveDeviceId(storage.adapter);

    assert.match(id, GUID);
    assert.equal(await resolveDeviceId(storage.adapter), id);
    assert.equal(peekDeviceId(), null);
  });
});
