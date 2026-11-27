import type { DetourConversion, DetourStorage } from "@swmansion/react-native-detour";
import type {
  DetourAttributionHost,
  DetourFetchResult,
} from "@swmansion/react-native-detour/attribution";

import type { ConversionValueSchema } from "../conversionValue/schema";
import {
  type NativeAttribution,
  type ProviderOptions,
  createAttributionProvider,
} from "../provider";

const SCHEMA: ConversionValueSchema = {
  version: 1,
  rules: [
    { event: "purchase", fine: 5, coarse: "low" },
    { event: "purchase", fine: 10, coarse: "medium", condition: { count_gte: 2 } },
  ],
};

const OPTIONS: ProviderOptions = { isChildDirected: false, readsIdfv: true, readsAppSetId: true };

const purchase: DetourConversion = {
  name: "purchase",
  revenue: 1,
  currency: "USD",
  revenueType: "iap",
};

const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const items = new Map(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const storage: DetourStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
};

const fakeNative = (overrides: Partial<NativeAttribution> = {}) => {
  const calls: string[] = [];
  const native = {
    isAvailable: true,
    register: jest.fn(async () => {
      calls.push("register");
      return true;
    }),
    updateConversionValue: jest.fn(async (fine: number) => {
      calls.push(`update ${fine}`);
      return true;
    }),
    attributionToken: jest.fn(async () => null),
    missingPostbackCopyKeys: () => [] as string[],
    metaInstallReferrer: jest.fn(async () => null),
    advertisingId: jest.fn(async () => null),
    attStatus: jest.fn(async () => "denied" as const),
    vendorId: jest.fn(async () => "idfv-1"),
    appSetId: jest.fn(async () => ({ id: "set-1", scope: "developer" as const })),
    ...overrides,
  };
  return { native, calls };
};

const fakeHost = (
  storage: DetourStorage,
  {
    allowed = true,
    installID = "install-1",
    fetched = { kind: "updated", body: SCHEMA, etag: '"v1"' },
  }: { allowed?: boolean; installID?: string; fetched?: DetourFetchResult } = {},
) => ({
  isAttributionAllowed: jest.fn(async () => allowed),
  installID: async () => installID,
  fetchConversionValueSchema: jest.fn(async () => fetched),
  storage,
});

// One macrotask lets every queued step and storage call finish.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const start = async (native: NativeAttribution, host: DetourAttributionHost) => {
  const provider = createAttributionProvider(native, OPTIONS);
  provider.didStart(host);
  await settle();
  return provider;
};

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("attribution provider", () => {
  it("registers once with consent and before the first conversion value", async () => {
    const { storage } = memoryStorage();
    const { native, calls } = fakeNative();
    const provider = await start(native, fakeHost(storage));

    provider.didLogConversion(purchase);
    provider.didLogConversion(purchase);
    await settle();

    expect(calls).toEqual(["register", "update 5", "update 10"]);
  });

  it("does not register without consent", async () => {
    const { native } = fakeNative();
    await start(native, fakeHost(memoryStorage().storage, { allowed: false }));

    expect(native.register).not.toHaveBeenCalled();
  });

  it("registers again after a refused registration", async () => {
    const { storage } = memoryStorage();
    const { native } = fakeNative({ register: jest.fn(async () => false) });
    const provider = await start(native, fakeHost(storage));

    provider.didLogConversion(purchase);
    await settle();

    expect(native.register).toHaveBeenCalledTimes(2);
  });

  it("does not register on the next launch once a conversion value was taken", async () => {
    const { storage } = memoryStorage();
    const { native } = fakeNative({ register: jest.fn(async () => false) });
    const provider = await start(native, fakeHost(storage));
    provider.didLogConversion(purchase);
    await settle();

    await start(native, fakeHost(storage));

    expect(native.register).toHaveBeenCalledTimes(2);
    expect(native.updateConversionValue).toHaveBeenCalledTimes(1);
  });

  it("sends a value only when it is higher, and again after SKAdNetwork refused it", async () => {
    const { storage } = memoryStorage();
    const updateConversionValue = jest
      .fn<Promise<boolean>, [number, unknown, boolean]>()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const { native } = fakeNative({ updateConversionValue });
    const provider = await start(native, fakeHost(storage));

    provider.didLogConversion({ ...purchase, name: "other" });
    provider.didLogConversion(purchase);
    provider.didLogConversion(purchase);
    provider.didLogConversion(purchase);
    await settle();

    // 5 refused; the second purchase matches 10; the third is not higher than 10.
    expect(updateConversionValue.mock.calls.map(([fine]) => fine)).toEqual([5, 10]);
  });

  it("keeps the cached schema on 304 and ignores an invalid one", async () => {
    const cached = { Detour_conversionValueSchema: { body: SCHEMA, etag: '"v1"' } };
    for (const fetched of [
      { kind: "notModified" },
      { kind: "updated", body: { rules: "none" }, etag: '"v2"' },
    ] as DetourFetchResult[]) {
      const { native } = fakeNative();
      const host = fakeHost(memoryStorage(cached).storage, { fetched });
      const provider = await start(native, host);

      provider.didLogConversion(purchase);
      await settle();

      expect(host.fetchConversionValueSchema).toHaveBeenCalledWith('"v1"');
      expect(native.updateConversionValue).toHaveBeenCalledWith(5, "low", false);
    }
  });

  it("starts over for a new install ID", async () => {
    const { storage } = memoryStorage();
    const first = fakeNative();
    const firstProvider = await start(first.native, fakeHost(storage));
    firstProvider.didLogConversion(purchase);
    await settle();

    const second = fakeNative();
    const secondProvider = await start(
      second.native,
      fakeHost(storage, { installID: "install-2" }),
    );
    secondProvider.didLogConversion(purchase);
    await settle();

    expect(second.calls).toEqual(["register", "update 5"]);
  });

  it("keeps the stored state when the storage cannot be read", async () => {
    const { storage, items } = memoryStorage();
    const { native } = fakeNative();
    const provider = await start(native, fakeHost(storage));
    const stored = items.get("Detour_conversionValueState");
    storage.getItem = () => {
      throw new Error("storage unavailable");
    };

    provider.didLogConversion(purchase);
    await settle();

    expect(items.get("Detour_conversionValueState")).toBe(stored);
    expect(native.updateConversionValue).not.toHaveBeenCalled();
  });

  it("warns at start when Info.plist lacks a postback copy key", async () => {
    const { native } = fakeNative({ missingPostbackCopyKeys: () => ["AttributionCopyEndpoint"] });
    await start(native, fakeHost(memoryStorage().storage));

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("AttributionCopyEndpoint"));
  });

  it("does nothing where the native module is missing", async () => {
    const { native } = fakeNative({ isAvailable: false });
    const host = fakeHost(memoryStorage().storage);
    const provider = await start(native, host);

    provider.didLogConversion(purchase);
    await settle();

    expect(host.fetchConversionValueSchema).not.toHaveBeenCalled();
    expect(native.register).not.toHaveBeenCalled();
    expect(native.updateConversionValue).not.toHaveBeenCalled();
  });

  it("reads no advertising ID in an app for children", async () => {
    const id = { id: "6d92078a-8246-4ba4-ae5b-76104861e7dc", type: "idfa" as const };
    const { native } = fakeNative({ advertisingId: jest.fn(async () => id) });

    expect(await createAttributionProvider(native, OPTIONS).advertisingId?.()).toEqual(id);
    const forChildren = createAttributionProvider(native, { ...OPTIONS, isChildDirected: true });
    expect(await forChildren.advertisingId?.()).toBeNull();
    expect(await forChildren.vendorId?.()).toBeNull();
    expect(await forChildren.appSetId?.()).toBeNull();
  });

  it("keeps the App Set ID on the device when the app turned it off", async () => {
    const { native } = fakeNative();

    expect(await createAttributionProvider(native, OPTIONS).appSetId?.()).toEqual({
      id: "set-1",
      scope: "developer",
    });
    const withoutAppSetId = createAttributionProvider(native, { ...OPTIONS, readsAppSetId: false });
    expect(await withoutAppSetId.appSetId?.()).toBeNull();
  });

  it("keeps the IDFV on the device when the app turned it off", async () => {
    const { native } = fakeNative();

    expect(await createAttributionProvider(native, OPTIONS).vendorId?.()).toBe("idfv-1");
    const withoutIdfv = createAttributionProvider(native, { ...OPTIONS, readsIdfv: false });
    expect(await withoutIdfv.vendorId?.()).toBeNull();
  });

  it("reads the Meta Install Referrer only with a Facebook app ID, apart from the match fields", async () => {
    const referrer = {
      install_referrer: "encrypted",
      is_ct: false,
      actual_timestamp: 1_700_000_000,
      source_app: "facebook" as const,
    };
    const { native } = fakeNative({ metaInstallReferrer: jest.fn(async () => referrer) });
    const provider = createAttributionProvider(native, { ...OPTIONS, facebookAppId: "123" });

    expect(createAttributionProvider(native, OPTIONS).metaInstallReferrer).toBeUndefined();
    expect(await provider.matchFields()).toEqual({});
    expect(native.metaInstallReferrer).not.toHaveBeenCalled();
    expect(await provider.metaInstallReferrer!()).toEqual(referrer);
    expect(native.metaInstallReferrer).toHaveBeenCalledWith("123");
  });

  it("passes a failed Meta read on, so the core SDK reads it again", async () => {
    const failure = new Error("DeadObjectException");
    const { native } = fakeNative({
      metaInstallReferrer: jest.fn(async () => Promise.reject(failure)),
    });

    await expect(
      createAttributionProvider(native, { ...OPTIONS, facebookAppId: "123" })
        .metaInstallReferrer!(),
    ).rejects.toBe(failure);
  });
});
