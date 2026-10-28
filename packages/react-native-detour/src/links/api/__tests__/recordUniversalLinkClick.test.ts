import { forgetRecordedClicks, recordUniversalLinkClick } from "../recordUniversalLinkClick";

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

const respondWith = (status: number, body: object) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  forgetRecordedClicks();
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  jest.spyOn(console, "warn").mockImplementation(() => {});
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  respondWith(200, { allowed: true, clickId: "click-1" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("recordUniversalLinkClick", () => {
  it("sends one request when the same open reaches the SDK twice", async () => {
    const first = recordUniversalLinkClick(request);
    now += 1500;
    const second = recordUniversalLinkClick(request);

    expect(await first).toEqual({ allowed: true, clickId: "click-1" });
    expect(await second).toEqual({ allowed: true, clickId: "click-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats two spellings of one link as the same click", async () => {
    await recordUniversalLinkClick(request);
    await recordUniversalLinkClick({
      ...request,
      url: "//myapp.godetour.link/abc123/product/42?ref=x",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends again once the repeat window has passed", async () => {
    await recordUniversalLinkClick(request);
    now += 10_000;
    await recordUniversalLinkClick(request);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends a separate request for a different link", async () => {
    await recordUniversalLinkClick(request);
    await recordUniversalLinkClick({
      ...request,
      url: "https://myapp.godetour.link/abc123/product/43",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses a denied result for the repeat", async () => {
    respondWith(402, { allowed: false, error: "Click limit exceeded", effectiveLimit: 100 });

    await recordUniversalLinkClick(request);
    const repeat = await recordUniversalLinkClick(request);

    expect(repeat).toMatchObject({ allowed: false, effectiveLimit: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the request fails", () => fetchMock.mockRejectedValueOnce(new Error("offline"))],
    ["the server returns an error", () => respondWith(500, {})],
  ])("lets the link open and sends the click again when %s", async (_case, fail) => {
    fail();
    const failed = await recordUniversalLinkClick(request);
    respondWith(200, { allowed: true, clickId: "click-2" });
    const retried = await recordUniversalLinkClick(request);

    expect(failed).toEqual({ allowed: true, clickId: null });
    expect(retried).toEqual({ allowed: true, clickId: "click-2" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
