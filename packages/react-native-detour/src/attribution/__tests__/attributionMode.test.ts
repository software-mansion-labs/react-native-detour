import { fakeAttributionProvider } from "../../__fixtures__/attributionProvider";
import type { DetourConversion } from "../../analytics/types/index";
import type { DetourAttributionHost, DetourAttributionProvider } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const loadModules = () => {
  let attributionMode!: typeof import("../attributionMode");
  let consent!: typeof import("../../consent/consent");
  jest.isolateModules(() => {
    attributionMode = require("../attributionMode");
    consent = require("../../consent/consent");
  });
  return { ...attributionMode, ...consent };
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
    const { setAttributionProvider, attributionTokenFor, ATTRIBUTION_TOKEN_TIMEOUT_MS } =
      loadModules();
    setAttributionProvider(fakeAttributionProvider(() => new Promise(() => {})));

    const token = attributionTokenFor("mmp");
    await jest.advanceTimersByTimeAsync(ATTRIBUTION_TOKEN_TIMEOUT_MS);

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

describe("startAttribution", () => {
  it("starts a provider once, and a new provider again", () => {
    const { setAttributionProvider, startAttribution } = loadModules();
    const first = fakeAttributionProvider();
    setAttributionProvider(first);
    startAttribution(host);
    setAttributionProvider(first);
    startAttribution(host);
    expect(first.didStart).toHaveBeenCalledTimes(1);

    const second = fakeAttributionProvider();
    setAttributionProvider(second);
    startAttribution(host);
    expect(second.didStart).toHaveBeenCalledWith(host);
  });
});
