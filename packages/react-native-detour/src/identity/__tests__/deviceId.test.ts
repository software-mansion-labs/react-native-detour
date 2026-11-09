import { Platform } from "react-native";

import * as Application from "expo-application";

import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { DetourStorage } from "../../links/types";

jest.mock("expo-application", () => ({
  getInstallationTimeAsync: jest.fn(),
  getLastUpdateTimeAsync: jest.fn(),
}));

const installTime = Application.getInstallationTimeAsync as jest.Mock;
const updateTime = Application.getLastUpdateTimeAsync as jest.Mock;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OLD_ID = "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01";
const INSTALLED_AT = new Date(1_790_000_000_000);

// The module caches per process; each load is a fresh app launch.
const loadModule = () => {
  let deviceId!: typeof import("../deviceId");
  jest.isolateModules(() => {
    deviceId = require("../deviceId");
  });
  return deviceId;
};

const getDeviceId = (storage: DetourStorage) => loadModule().getDeviceId(storage);

beforeEach(() => {
  installTime.mockResolvedValue(INSTALLED_AT);
  updateTime.mockResolvedValue(new Date(1_795_000_000_000));
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.dontMock("expo-crypto");
  Platform.OS = "ios";
});

describe("install identity", () => {
  it("keeps the device ID and first-launch flag across launches of one install", async () => {
    const { storage, items } = memoryStorage();

    const first = await getDeviceId(storage);
    items.set("Detour_firstEntranceFlag", "true");

    expect(first).toMatch(UUID);
    expect(await getDeviceId(storage)).toBe(first);
    expect(items.get("Detour_firstEntranceFlag")).toBe("true");
  });

  it("starts a new install when the storage came back from a backup of another install", async () => {
    const { storage, items } = memoryStorage({
      Detour_deviceId: OLD_ID,
      Detour_firstEntranceFlag: "true",
      Detour_installTime: "1780000000000",
    });

    const deviceId = await getDeviceId(storage);

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

    expect(await getDeviceId(storage)).toBe(OLD_ID);
    expect(items.get("Detour_firstEntranceFlag")).toBe("true");
    expect(items.get("Detour_installTime")).toBe("1790000000000");
  });

  it("starts a new install on a never-updated Android app restored from a 2.x backup", async () => {
    Platform.OS = "android";
    updateTime.mockResolvedValue(INSTALLED_AT);
    const { storage, items } = memoryStorage({
      Detour_deviceId: OLD_ID,
      Detour_firstEntranceFlag: "true",
    });

    expect(await getDeviceId(storage)).not.toBe(OLD_ID);
    expect(items.get("Detour_firstEntranceFlag")).toBe("false");
  });

  it("keeps the stored values and warns when the install time is not available", async () => {
    installTime.mockRejectedValue(new Error("no package info"));
    const { storage } = memoryStorage({
      Detour_deviceId: OLD_ID,
      Detour_installTime: "1780000000000",
    });

    expect(await getDeviceId(storage)).toBe(OLD_ID);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Could not read the install time"),
      expect.any(Error),
    );
  });

  it("does not throw from reconcileInstall when the storage fails", async () => {
    const { storage } = memoryStorage({ Detour_installTime: "1780000000000" });
    storage.setItem = () => {
      throw new Error("disk full");
    };

    await expect(loadModule().reconcileInstall(storage)).resolves.toBeUndefined();
  });
});

describe("generateUUID", () => {
  const globalWithCrypto = globalThis as { crypto?: unknown };
  const originalCrypto = globalWithCrypto.crypto;

  afterEach(() => {
    globalWithCrypto.crypto = originalCrypto;
    jest.resetModules();
  });

  it("uses expo-crypto first", () => {
    jest.doMock(
      "expo-crypto",
      () => ({ randomUUID: () => "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }),
      {
        virtual: true,
      },
    );

    expect(loadModule().generateUUID()).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("falls back to Web Crypto when expo-crypto throws without its native module", () => {
    jest.doMock(
      "expo-crypto",
      () => ({
        randomUUID: () => {
          throw new Error("native module missing");
        },
      }),
      { virtual: true },
    );
    globalWithCrypto.crypto = { randomUUID: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };

    expect(loadModule().generateUUID()).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("builds a v4 UUID from getRandomValues", () => {
    jest.doMock("expo-crypto", () => ({}), { virtual: true });
    globalWithCrypto.crypto = { getRandomValues: (array: Uint8Array) => array.fill(0xff) };

    expect(loadModule().generateUUID()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("falls back to Math.random with a warning", () => {
    jest.doMock("expo-crypto", () => ({}), { virtual: true });
    globalWithCrypto.crypto = undefined;

    expect(loadModule().generateUUID()).toMatch(UUID);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("No secure random source found"),
    );
  });
});
