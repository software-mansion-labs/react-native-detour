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

describe("attributionTokenFor", () => {
  it("does not ask the provider for a core request", async () => {
    const { setAttributionProvider, attributionTokenFor } = loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);

    expect(await attributionTokenFor("core")).toBeNull();
    expect(provider.attributionToken).not.toHaveBeenCalled();
  });

  it("returns the provider's token for an mmp request", async () => {
    const { setAttributionProvider, attributionTokenFor } = loadModules();
    setAttributionProvider(fakeAttributionProvider());

    expect(await attributionTokenFor("mmp")).toBe("token");
  });

  it("gives up on a slow provider after the timeout", async () => {
    jest.useFakeTimers();
    const { setAttributionProvider, attributionTokenFor, ATTRIBUTION_FIELDS_TIMEOUT_MS } =
      loadModules();
    setAttributionProvider(fakeAttributionProvider(() => new Promise(() => {})));

    const token = attributionTokenFor("mmp");
    await jest.advanceTimersByTimeAsync(ATTRIBUTION_FIELDS_TIMEOUT_MS);

    expect(await token).toBeNull();
  });

  it("returns null when the provider throws", async () => {
    const { setAttributionProvider, attributionTokenFor } = loadModules();
    setAttributionProvider({
      ...fakeAttributionProvider(),
      attributionToken: () => {
        throw new Error("no AdServices");
      },
    } as DetourAttributionProvider);

    expect(await attributionTokenFor("mmp")).toBeNull();
  });
});

describe("forwardConversion", () => {
  it("forwards a conversion only with consent to attribution passed on this launch", async () => {
    const { setAttributionProvider, forwardConversion, setConsent } = loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);

    await forwardConversion(conversion);
    setConsent({ purposes: { attribution: false } });
    await forwardConversion(conversion);
    expect(provider.didLogConversion).not.toHaveBeenCalled();

    setConsent({ purposes: { attribution: true } });
    await forwardConversion(conversion);
    expect(provider.didLogConversion).toHaveBeenCalledWith(conversion);
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
