import { fakeAttributionProvider } from "../../__fixtures__/attributionProvider";
import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { DetourConversion } from "../../analytics/types/index";
import type { DetourAttributionHost, DetourAttributionProvider } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const loadModules = () => {
  let attributionMode!: typeof import("../attributionMode");
  let consent!: typeof import("../../consent/consent");
  let sdkConfig!: typeof import("../../consent/sdkConfig");
  let killSwitch!: typeof import("../../consent/killSwitch");
  jest.isolateModules(() => {
    attributionMode = require("../attributionMode");
    consent = require("../../consent/consent");
    sdkConfig = require("../../consent/sdkConfig");
    killSwitch = require("../../consent/killSwitch");
  });
  return { ...attributionMode, ...consent, ...sdkConfig, ...killSwitch };
};

const host = {} as DetourAttributionHost;
const conversion: DetourConversion = {
  name: "purchase",
  revenue: 9.99,
  currency: "USD",
  revenueType: "iap",
};

afterEach(() => {
  jest.useRealTimers();
});

describe("deviceIdentifiersFor", () => {
  const idfa = { id: "6d92078a-8246-4ba4-ae5b-76104861e7dc", type: "idfa" as const };
  const providerWithId = () => ({
    ...fakeAttributionProvider(),
    advertisingId: jest.fn(async () => idfa),
  });

  it("sends the advertising ID only with consent to sharing with ad networks", async () => {
    const { setAttributionProvider, setConsent, deviceIdentifiersFor } = loadModules();
    setAttributionProvider(providerWithId());

    setConsent({ purposes: { attribution: true, ad_network_sharing: false } });
    expect(await deviceIdentifiersFor("mmp")).toEqual({});

    setConsent({ purposes: { attribution: true, ad_network_sharing: true } });
    expect(await deviceIdentifiersFor("mmp")).toEqual({ advertising_id: idfa });
  });

  it("reads nothing for a core request", async () => {
    const { setAttributionProvider, setConsent, deviceIdentifiersFor } = loadModules();
    const provider = providerWithId();
    setAttributionProvider(provider);
    setConsent({ purposes: { ad_network_sharing: true } });

    expect(await deviceIdentifiersFor("core")).toEqual({});
    expect(provider.advertisingId).not.toHaveBeenCalled();
  });
});

describe("attributionMatchFieldsFor", () => {
  const metaReferrer = {
    install_referrer: "encrypted",
    is_ct: true,
    actual_timestamp: 1_700_000_000,
    source_app: "facebook" as const,
  };

  it("does not ask the provider for a core request", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);

    expect(await attributionMatchFieldsFor("core", jest.fn())).toEqual({});
    expect(provider.matchFields).not.toHaveBeenCalled();
  });

  it("returns the provider's fields for an mmp request", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    setAttributionProvider(fakeAttributionProvider());

    expect(await attributionMatchFieldsFor("mmp", jest.fn())).toEqual({ asa_token: "token" });
  });

  it("goes without a slow provider and passes on a Meta referrer that comes later", async () => {
    jest.useFakeTimers();
    const { setAttributionProvider, attributionMatchFieldsFor, ATTRIBUTION_FIELDS_TIMEOUT_MS } =
      loadModules();
    let answer!: (fields: object) => void;
    setAttributionProvider(
      fakeAttributionProvider(() => new Promise((resolve) => (answer = resolve))),
    );
    const onLate = jest.fn();

    const fields = attributionMatchFieldsFor("mmp", onLate);
    await jest.advanceTimersByTimeAsync(ATTRIBUTION_FIELDS_TIMEOUT_MS);
    expect(await fields).toEqual({});

    answer({ meta_install_referrer: metaReferrer });
    await jest.advanceTimersByTimeAsync(0);
    expect(onLate).toHaveBeenCalledWith(metaReferrer);
  });

  it("returns no fields when the provider throws", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    setAttributionProvider({
      ...fakeAttributionProvider(),
      matchFields: () => {
        throw new Error("no AdServices");
      },
    } as DetourAttributionProvider);

    expect(await attributionMatchFieldsFor("mmp", jest.fn())).toEqual({});
  });
});

describe("forwardConversion", () => {
  it("keeps a conversion logged before the choice and forwards it after a grant", async () => {
    const { setAttributionProvider, forwardConversion, setConsent, startAttribution } =
      loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);

    const beforeStart = forwardConversion(conversion);
    startAttribution(host);
    const whileWaiting = forwardConversion(conversion);
    await settle();
    expect(provider.didLogConversion).not.toHaveBeenCalled();

    setConsent({ purposes: { attribution: true } });
    await Promise.all([beforeStart, whileWaiting]);
    expect(provider.didLogConversion).toHaveBeenCalledTimes(2);
    const [startedAt] = provider.didStart.mock.invocationCallOrder;
    const [forwardedAt] = provider.didLogConversion.mock.invocationCallOrder;
    expect(startedAt).toBeLessThan(forwardedAt!);
  });

  it("drops conversions kept before a refusal", async () => {
    const { setAttributionProvider, forwardConversion, setConsent, startAttribution } =
      loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);
    startAttribution(host);

    const kept = forwardConversion(conversion);
    setConsent({ purposes: { attribution: false } });
    await kept;
    await forwardConversion(conversion);

    expect(provider.didLogConversion).not.toHaveBeenCalled();
  });
});

// Lets pending gate checks finish.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  warn.mockClear();
});

describe("startAttribution", () => {
  it("starts a provider once, and a new provider again", async () => {
    const { setAttributionProvider, setConsent, startAttribution } = loadModules();
    setConsent({ purposes: { attribution: true } });
    const first = fakeAttributionProvider();
    setAttributionProvider(first);
    startAttribution(host);
    setAttributionProvider(first);
    startAttribution(host);
    await settle();
    expect(first.didStart).toHaveBeenCalledTimes(1);

    const second = fakeAttributionProvider();
    setAttributionProvider(second);
    startAttribution(host);
    await settle();
    expect(second.didStart).toHaveBeenCalledWith(host);
  });

  it("releases kept conversions when the provider fails to start", async () => {
    const { setAttributionProvider, setConsent, startAttribution, forwardConversion } =
      loadModules();
    const provider = fakeAttributionProvider();
    provider.didStart.mockImplementation(() => {
      throw new Error("native call failed");
    });
    setAttributionProvider(provider);
    const kept = forwardConversion(conversion);

    setConsent({ purposes: { attribution: true } });
    startAttribution(host);
    await kept;

    expect(provider.didLogConversion).toHaveBeenCalledTimes(1);
  });

  it("starts the provider once consent passed after the start decides the gate", async () => {
    const { setAttributionProvider, setConsent, startAttribution } = loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);
    startAttribution(host);
    await settle();
    expect(provider.didStart).not.toHaveBeenCalled();

    setConsent({ purposes: { attribution: true } });
    await settle();
    expect(provider.didStart).toHaveBeenCalledWith(host);
  });
});

describe("whenAttributionDecided", () => {
  const isDecidedAfterSettle = async (decided: Promise<void>) => {
    let isDecided = false;
    decided.then(() => {
      isDecided = true;
    });
    await settle();
    return () => isDecided;
  };

  it("waits for the user's choice, a grant or a refusal", async () => {
    for (const attribution of [true, false]) {
      const { setAttributionProvider, setConsent, whenAttributionDecided } = loadModules();
      setAttributionProvider(fakeAttributionProvider());

      const isDecided = await isDecidedAfterSettle(whenAttributionDecided());
      expect(isDecided()).toBe(false);

      setConsent({ purposes: { attribution } });
      await settle();
      expect(isDecided()).toBe(true);
    }
  });

  it("does not wait without a provider, with an open gate or with a gate it cannot read", async () => {
    const off = loadModules();
    expect(await off.isWaitingForAttributionConsent()).toBe(false);

    const open = loadModules();
    open.setAttributionProvider(fakeAttributionProvider());
    open.configureSdkConfig(memoryStorage().storage, "app");
    await open.applySdkConfig(
      { schema_version: 1, consent_gate_default: { attribution: "open" } },
      null,
    );
    expect(await open.isWaitingForAttributionConsent()).toBe(false);

    const unreadable = loadModules();
    const { storage } = memoryStorage();
    storage.getItem = () => {
      throw new Error("storage unavailable");
    };
    unreadable.configureKillSwitch(storage, { apiKey: "key", appID: "app" }, async () => "device");
    unreadable.setAttributionProvider(fakeAttributionProvider());
    expect(await unreadable.isWaitingForAttributionConsent()).toBe(false);
  });
});

describe("forwardConversion with a replaced provider", () => {
  it("drops conversions kept for the old provider", async () => {
    const { setAttributionProvider, forwardConversion } = loadModules();
    const old = fakeAttributionProvider();
    setAttributionProvider(old);
    const kept = forwardConversion(conversion);

    setAttributionProvider(fakeAttributionProvider());
    await kept;

    expect(old.didLogConversion).not.toHaveBeenCalled();
  });
});
