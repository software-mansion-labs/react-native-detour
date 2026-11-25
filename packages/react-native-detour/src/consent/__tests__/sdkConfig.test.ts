import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const loadModule = () => {
  let sdkConfig!: typeof import("../sdkConfig");
  jest.isolateModules(() => {
    sdkConfig = require("../sdkConfig");
  });
  return sdkConfig;
};

const body = {
  schema_version: 1,
  purposes: ["analytics", "attribution", "ad_network_sharing", "ad_personalization"],
  consent_gate_default: {
    analytics: "closed",
    attribution: "closed",
    ad_network_sharing: "closed",
    ad_personalization: "closed",
  },
  attribution_window_days_default: 7,
};

const requestConfig = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };

describe("sdk config", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("closes every gate before the first fetch ends, then opens only analytics if it failed", async () => {
    const { configureSdkConfig, getSdkConfig, gateDefault, refreshSdkConfig } = loadModule();
    configureSdkConfig(memoryStorage().storage, "app");
    expect(gateDefault(await getSdkConfig(), "analytics")).toBe("closed");

    jest.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await refreshSdkConfig(requestConfig);
    const config = await getSdkConfig();
    expect(gateDefault(config, "analytics")).toBe("open");
    expect(gateDefault(config, "attribution")).toBe("closed");
  });

  it("keeps server values across launches and sends the ETag back", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
      headers: { get: () => '"v1"' },
    });
    const first = loadModule();
    first.configureSdkConfig(storage, "app");
    expect(await first.refreshSdkConfig(requestConfig)).toBe(true);
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");

    const relaunched = loadModule();
    relaunched.configureSdkConfig(storage, "app");
    expect(relaunched.gateDefault(await relaunched.getSdkConfig(), "analytics")).toBe("closed");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 304, headers: { get: () => null } });
    expect(await relaunched.refreshSdkConfig(requestConfig)).toBe(false);
    expect(fetchMock.mock.calls[1][1].headers["If-None-Match"]).toBe('"v1"');
    expect(relaunched.gateDefault(await relaunched.getSdkConfig(), "analytics")).toBe("closed");
  });

  it("ignores the cache of another app", async () => {
    const { storage } = memoryStorage();
    const first = loadModule();
    first.configureSdkConfig(storage, "other");
    await first.applySdkConfig(body, '"v1"');

    const second = loadModule();
    second.configureSdkConfig(storage, "app");
    await second.getSdkConfig();
    expect(second.isSdkConfigKnown()).toBe(false);
  });

  it("ignores a body in an unexpected shape and unknown gate values", () => {
    const { parseSdkConfig, gateDefault } = loadModule();
    expect(parseSdkConfig({ schema_version: 1, consent_gate_default: "open" })).toBeNull();

    const config = parseSdkConfig({
      schema_version: 2,
      consent_gate_default: { analytics: "grandfather" },
    });
    expect(config && gateDefault(config, "analytics")).toBe("closed");
  });
});

describe("first launch without a cached config", () => {
  const loadGate = () => {
    let sdkConfig!: typeof import("../sdkConfig");
    let consentGate!: typeof import("../consentGate");
    jest.isolateModules(() => {
      sdkConfig = require("../sdkConfig");
      consentGate = require("../consentGate");
    });
    return { ...sdkConfig, ...consentGate };
  };

  it("keeps analytics waiting until the fetch ends, then follows the server", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
      headers: { get: () => null },
    })) as unknown as typeof fetch;
    const sdk = loadGate();
    sdk.configureSdkConfig(memoryStorage().storage, "app");

    expect(await sdk.decideNow("analytics")).toBe("wait");
    await sdk.refreshSdkConfig(requestConfig);
    expect(await sdk.decideNow("analytics")).toBe("wait");
  });

  it("falls back to open analytics once a failed fetch ends", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const sdk = loadGate();
    sdk.configureSdkConfig(memoryStorage().storage, "app");

    expect(await sdk.decideNow("analytics")).toBe("wait");
    await sdk.refreshSdkConfig(requestConfig);
    expect(await sdk.decideNow("analytics")).toBe("send");
  });

  it("does not wait when a config is cached from an earlier launch", async () => {
    const cached = {
      appID: "app",
      etag: null,
      body: { schema_version: 1, consent_gate_default: { analytics: "open" } },
    };
    const sdk = loadGate();
    sdk.configureSdkConfig(
      memoryStorage({ Detour_sdkConfig: JSON.stringify(cached) }).storage,
      "app",
    );

    expect(await sdk.decideNow("analytics")).toBe("send");
  });
});
