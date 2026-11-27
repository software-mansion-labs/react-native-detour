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

describe("attributionMatchFieldsFor", () => {
  const metaReferrer = {
    install_referrer: "encrypted",
    is_ct: true,
    actual_timestamp: 1_700_000_000,
    source_app: "facebook" as const,
  };
  const hooks = () => ({ started: jest.fn(), answered: jest.fn(), answeredLate: jest.fn() });

  it("does not ask the provider for a core request", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    const provider = fakeAttributionProvider();
    setAttributionProvider(provider);

    expect(await attributionMatchFieldsFor("core", hooks())).toEqual({});
    expect(provider.matchFields).not.toHaveBeenCalled();
  });

  it("returns the provider's fields for an mmp request", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    setAttributionProvider(fakeAttributionProvider());

    expect(await attributionMatchFieldsFor("mmp", hooks())).toEqual({ asa_token: "token" });
  });

  it("goes without a slow provider", async () => {
    jest.useFakeTimers();
    const { setAttributionProvider, attributionMatchFieldsFor, ATTRIBUTION_FIELDS_TIMEOUT_MS } =
      loadModules();
    setAttributionProvider(fakeAttributionProvider(() => new Promise(() => {})));
    const meta = hooks();

    const fields = attributionMatchFieldsFor("mmp", meta);
    await jest.advanceTimersByTimeAsync(ATTRIBUTION_FIELDS_TIMEOUT_MS);

    expect(await fields).toEqual({});
    expect(meta.started).not.toHaveBeenCalled();
  });

  it("returns no fields when the provider throws", async () => {
    const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
    setAttributionProvider({
      ...fakeAttributionProvider(),
      matchFields: () => {
        throw new Error("no AdServices");
      },
    } as DetourAttributionProvider);

    expect(await attributionMatchFieldsFor("mmp", hooks())).toEqual({});
  });

  describe("the Meta Install Referrer", () => {
    it("is read next to the fields and added to them", async () => {
      const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
      const provider = fakeAttributionProvider(undefined, async () => metaReferrer);
      setAttributionProvider(provider);
      const meta = hooks();

      expect(await attributionMatchFieldsFor("mmp", meta)).toEqual({
        asa_token: "token",
        meta_install_referrer: metaReferrer,
      });
      expect(meta.started).toHaveBeenCalledTimes(1);
      expect(meta.answered).toHaveBeenCalledWith({ found: metaReferrer });
    });

    it.each([
      ["none", async () => null],
      [
        "failed",
        async () => {
          throw new Error("DeadObjectException");
        },
      ],
    ])("tells a read with %s apart", async (read, metaInstallReferrer) => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      const { setAttributionProvider, attributionMatchFieldsFor } = loadModules();
      setAttributionProvider(fakeAttributionProvider(undefined, metaInstallReferrer));
      const meta = hooks();

      expect(await attributionMatchFieldsFor("mmp", meta)).toEqual({ asa_token: "token" });
      expect(meta.answered).toHaveBeenCalledWith(read);
    });

    it("passes on a referrer read after the limit as late", async () => {
      jest.useFakeTimers();
      const { setAttributionProvider, attributionMatchFieldsFor, ATTRIBUTION_FIELDS_TIMEOUT_MS } =
        loadModules();
      let answer!: (referrer: typeof metaReferrer) => void;
      setAttributionProvider(
        fakeAttributionProvider(undefined, () => new Promise((resolve) => (answer = resolve))),
      );
      const meta = hooks();

      const fields = attributionMatchFieldsFor("mmp", meta);
      await jest.advanceTimersByTimeAsync(ATTRIBUTION_FIELDS_TIMEOUT_MS);
      expect(await fields).toEqual({});
      expect(meta.answeredLate).not.toHaveBeenCalled();

      answer(metaReferrer);
      await jest.advanceTimersByTimeAsync(0);
      expect(meta.answeredLate).toHaveBeenCalledWith({ found: metaReferrer });
      expect(meta.answered).not.toHaveBeenCalled();
    });
  });
});

describe("readMetaInstallReferrerAgain", () => {
  it("is null without a provider that can read it", () => {
    const { setAttributionProvider, readMetaInstallReferrerAgain } = loadModules();
    expect(readMetaInstallReferrerAgain()).toBeNull();
    setAttributionProvider(fakeAttributionProvider());
    expect(readMetaInstallReferrerAgain()).toBeNull();
  });

  it("reads it with the provider", async () => {
    const { setAttributionProvider, readMetaInstallReferrerAgain } = loadModules();
    setAttributionProvider(fakeAttributionProvider(undefined, async () => null));
    expect(await readMetaInstallReferrerAgain()).toBe("none");
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
