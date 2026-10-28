import { forgetRecordedClicks } from "../../links/api/recordUniversalLinkClick";
import { resolveShortLink } from "../../links/api/resolveShortLink";
import { claimOpenForProvider, forgetLinkOpens } from "../../links/utils/linkOpens";
import { createDetourNativeIntentHandler } from "../nativeIntent";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { nativeAppVersion: "1.0.0" },
}));

jest.mock("../../links/utils/deviceInfo", () => ({
  getSyncDeviceInfo: () => ({ model: "iPhone", osVersion: "18.0" }),
}));

jest.mock("../../links/api/resolveShortLink", () => ({
  resolveShortLink: jest.fn(),
}));

const LINK = "https://myapp.godetour.link/abc123/product/42?ref=x";
const SHORT_LINK = "https://myapp.godetour.link/Xy7Ab";
const config = { apiKey: "key", appID: "app" };

const resolveShortLinkMock = resolveShortLink as jest.Mock;
let fetchMock: jest.Mock;

beforeEach(() => {
  forgetRecordedClicks();
  forgetLinkOpens();
  fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ allowed: true, clickId: "click-1" }),
  });
  global.fetch = fetchMock;
  resolveShortLinkMock.mockReset();
});

describe("createDetourNativeIntentHandler", () => {
  it("routes the link in resolve mode, so DetourProvider skips it", async () => {
    const handler = createDetourNativeIntentHandler({ config });

    expect(await handler({ path: LINK, initial: true })).toBe("/product/42?ref=x");
    expect(await claimOpenForProvider(LINK)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the link to DetourProvider when the short link cannot be resolved", async () => {
    resolveShortLinkMock.mockRejectedValue(new Error("timeout"));
    const onResolveError = jest.fn();
    const handler = createDetourNativeIntentHandler({
      fallbackPath: "/home",
      config: { ...config, onResolveError },
    });

    expect(await handler({ path: SHORT_LINK, initial: true })).toBe("/home");
    expect(onResolveError).toHaveBeenCalledTimes(1);
    expect(await claimOpenForProvider(SHORT_LINK)).toBe(true);
  });

  it("keeps DetourProvider waiting while it resolves the short link", async () => {
    resolveShortLinkMock.mockResolvedValue({ link: LINK });
    const handler = createDetourNativeIntentHandler({ config });

    const route = handler({ path: SHORT_LINK, initial: false });
    const claim = claimOpenForProvider(SHORT_LINK);

    expect(await route).toBe("/product/42?ref=x");
    expect(await claim).toBe(false);
  });

  it("leaves the link to DetourProvider in intercept mode", async () => {
    const handler = createDetourNativeIntentHandler();

    expect(await handler({ path: LINK, initial: true })).toBe("");
    expect(await claimOpenForProvider(LINK)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
