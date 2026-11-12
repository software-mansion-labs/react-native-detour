import { sendEvent } from "../../analytics/api/events";
import { sendRetentionEvent } from "../../analytics/api/retention";
import { getDeferredLink } from "../../links/api/getDeferredLink";
import { resolveShortLink } from "../../links/api/resolveShortLink";
import { sendUniversalLinkClick } from "../../links/api/sendUniversalLinkClick";
import { DETOUR_ENDPOINTS, type DetourEndpoint, buildApiUrl } from "../endpoints";

jest.mock("expo-application", () => ({
  getInstallReferrerAsync: jest.fn(async () => "click_id=abc"),
}));
jest.mock("expo-constants", () => ({ nativeAppVersion: "1.0.0" }));
jest.mock("../../links/utils/deviceInfo", () => ({
  getSyncDeviceInfo: () => ({ model: "test", osVersion: "1.0" }),
}));
jest.mock("../../links/utils/fingerprint", () => ({
  getDeterministicFingerprint: (clickId: string) => ({ clickId }),
  getProbabilisticFingerprint: jest.fn(),
}));

const endpoints = Object.keys(DETOUR_ENDPOINTS) as DetourEndpoint[];

describe("buildApiUrl", () => {
  it("keeps the production addresses without baseUrl", () => {
    expect(endpoints.map((endpoint) => buildApiUrl(endpoint))).toEqual([
      "https://godetour.dev/api/link/match-link",
      "https://godetour.dev/api/link/resolve-short",
      "https://godetour.dev/api/link/universal-link-click",
      "https://godetour.dev/api/analytics/event",
      "https://godetour.dev/api/analytics/retention",
    ]);
  });

  it("uses a custom base for every endpoint", () => {
    for (const endpoint of endpoints) {
      expect(buildApiUrl(endpoint, "https://api.example.com")).toBe(
        `https://api.example.com/${DETOUR_ENDPOINTS[endpoint]}`,
      );
    }
  });

  it("keeps the base path and ignores a trailing slash", () => {
    expect(buildApiUrl("analyticsEvent", "https://example.com/detour/")).toBe(
      "https://example.com/detour/api/analytics/event",
    );
  });

  it("rejects bases that are not https", () => {
    expect(buildApiUrl("matchLink", "http://localhost:3000")).toBeNull();
    expect(buildApiUrl("matchLink", "ftp://example.com")).toBeNull();
    expect(buildApiUrl("matchLink", "https://")).toBeNull();
    expect(buildApiUrl("matchLink", "not a url")).toBeNull();
  });
});

describe("API calls with baseUrl", () => {
  const fetchMock = jest.fn(async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  }));

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const callEveryEndpoint = async (baseUrl: string) => {
    const credentials = { apiKey: "key", appID: "app", baseUrl };
    const url = "https://app.godetour.link/abc";

    await getDeferredLink({ ...credentials, shouldUseClipboard: false });
    await resolveShortLink({ ...credentials, url });
    await sendUniversalLinkClick({ ...credentials, url });
    await sendEvent({ ...credentials, deviceId: "device", event: { eventName: "test" as never } });
    await sendRetentionEvent({ ...credentials, deviceId: "device", eventName: "app_open" });
  };

  it("sends every request to the configured host", async () => {
    await callEveryEndpoint("https://api.example.com");

    const requestedUrls = fetchMock.mock.calls.map((call) => (call as unknown[])[0]);
    expect(new Set(requestedUrls)).toEqual(
      new Set(endpoints.map((endpoint) => `https://api.example.com/${DETOUR_ENDPOINTS[endpoint]}`)),
    );
  });

  it("sends no requests with a base that is not https", async () => {
    await callEveryEndpoint("http://api.example.com");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
