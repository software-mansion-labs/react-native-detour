import type { sendUniversalLinkClick as SendUniversalLinkClick } from "../sendUniversalLinkClick";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { nativeAppVersion: "1.0.0" },
}));

jest.mock("../../utils/deviceInfo", () => ({
  getSyncDeviceInfo: () => ({ model: "iPhone", osVersion: "18.0" }),
}));

const LINK = "https://myapp.godetour.link/abc123/product/42?ref=x";
const request = { apiKey: "key", appID: "app", url: LINK };

let now = 0;
let fetchMock: jest.Mock;
let sendUniversalLinkClick: typeof SendUniversalLinkClick;

const respondWith = (status: number, body: object) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  jest.resetModules();
  ({ sendUniversalLinkClick } = require("../sendUniversalLinkClick"));
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  respondWith(200, { allowed: true, clickId: "click-1" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("sendUniversalLinkClick", () => {
  it("sends one request when the same open reaches the SDK twice", async () => {
    const first = sendUniversalLinkClick({ ...request, source: "native-intent" });
    now += 1500;
    const second = sendUniversalLinkClick({ ...request, source: "provider" });

    expect(await first).toEqual({ allowed: true, clickId: "click-1" });
    expect(await second).toEqual({
      allowed: true,
      clickId: "click-1",
      repeatOf: { source: "native-intent", elapsedMs: 1500 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats URLs that differ only in formatting as the same click", async () => {
    await sendUniversalLinkClick({ ...request, source: "native-intent" });
    const repeat = await sendUniversalLinkClick({
      ...request,
      url: "https://MyApp.godetour.link/abc123/product/42?ref=x",
      source: "provider",
    });

    expect(repeat.repeatOf?.source).toBe("native-intent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends again once the repeat window has passed", async () => {
    await sendUniversalLinkClick({ ...request, source: "provider" });
    now += 10_000;
    const later = await sendUniversalLinkClick({ ...request, source: "provider" });

    expect(later.repeatOf).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends a separate request for a different link", async () => {
    await sendUniversalLinkClick({ ...request, source: "provider" });
    await sendUniversalLinkClick({
      ...request,
      url: "https://myapp.godetour.link/abc123/product/43",
      source: "provider",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses a denied result for the repeat", async () => {
    respondWith(402, { allowed: false, error: "Click limit exceeded", effectiveLimit: 100 });

    await sendUniversalLinkClick({ ...request, source: "native-intent" });
    const repeat = await sendUniversalLinkClick({ ...request, source: "provider" });

    expect(repeat).toMatchObject({ allowed: false, effectiveLimit: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
