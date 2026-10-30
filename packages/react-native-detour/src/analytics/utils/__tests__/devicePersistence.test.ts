import * as Application from "expo-application";

import type { DetourStorage } from "../../../links/types";

jest.mock("expo-application", () => ({ getInstallationTimeAsync: jest.fn() }));

const installTime = Application.getInstallationTimeAsync as jest.Mock;

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  const storage: DetourStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OLD_ID = "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01";

// The module caches the device ID per process; each test is a fresh app launch.
const prepareDeviceId = (storage: DetourStorage) => {
  let prepare!: (storage: DetourStorage) => Promise<string>;
  jest.isolateModules(() => {
    prepare = require("../devicePersistence").prepareDeviceIdForApi;
  });
  return prepare(storage);
};

beforeEach(() => {
  installTime.mockResolvedValue(new Date(1_790_000_000_000));
});

it("keeps the device ID and first-launch flag across launches of one install", async () => {
  const { storage, items } = memoryStorage();

  const first = await prepareDeviceId(storage);
  items.set("Detour_firstEntranceFlag", "true");

  expect(first).toMatch(UUID);
  expect(await prepareDeviceId(storage)).toBe(first);
  expect(items.get("Detour_firstEntranceFlag")).toBe("true");
});

it("starts a new install when the storage came back from a backup of another install", async () => {
  const { storage, items } = memoryStorage({
    Detour_deviceId: OLD_ID,
    Detour_firstEntranceFlag: "true",
    Detour_installTime: "1780000000000",
  });

  const deviceId = await prepareDeviceId(storage);

  expect(deviceId).not.toBe(OLD_ID);
  expect(deviceId).toMatch(UUID);
  expect(items.get("Detour_firstEntranceFlag")).toBe("false");
  expect(items.get("Detour_installTime")).toBe("1790000000000");
});

it("keeps the device ID and flag after an update from SDK 2.x, which stored no install time", async () => {
  const { storage, items } = memoryStorage({
    Detour_deviceId: " 3F2B8C1E-9D4A-4C55-8F0E-2A6B7C8D9E01 ",
    Detour_firstEntranceFlag: "true",
  });

  expect(await prepareDeviceId(storage)).toBe(OLD_ID);
  expect(items.get("Detour_firstEntranceFlag")).toBe("true");
  expect(items.get("Detour_installTime")).toBe("1790000000000");
});

it("keeps the stored values when the install time is not available", async () => {
  installTime.mockRejectedValue(new Error("no package info"));
  const { storage } = memoryStorage({
    Detour_deviceId: OLD_ID,
    Detour_installTime: "1780000000000",
  });

  expect(await prepareDeviceId(storage)).toBe(OLD_ID);
});
