import * as Application from "expo-application";

import { getDeferredLink } from "../getDeferredLink";

jest.mock("../../../net/requestContext", () => ({ getRequestContext: async () => ({}) }));
jest.mock("expo-application", () => ({ getInstallReferrerAsync: jest.fn() }));
jest.mock("../../utils/matchSignals", () => ({
  buildDirectMatchRequest: (clickId: string) => ({ clickId }),
  buildSignalMatchRequest: jest.fn(async () => ({ platform: "android" })),
}));

const deviceId = "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01";
const fetchMock = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));

const sentBody = async (referrer: string | null) => {
  jest.mocked(Application.getInstallReferrerAsync).mockResolvedValue(referrer as string);
  await getDeferredLink({
    apiKey: "key",
    appID: "app",
    shouldUseClipboard: false,
    baseUrl: "https://api.example.com",
    deviceId,
    userId: null,
  });
  return JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
};

beforeEach(() => {
  fetchMock.mockClear();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getDeferredLink install_referrer", () => {
  it("sends the referrer with the click ID match", async () => {
    expect(await sentBody("utm_source=google&click_id=x")).toEqual({
      clickId: "x",
      device_id: deviceId,
      install_referrer: { raw: "utm_source=google&click_id=x", utm: { source: "google" } },
    });
  });

  it("sends the referrer with signal matching when it has no click ID", async () => {
    expect(await sentBody("gclid=AbC.123")).toEqual({
      platform: "android",
      device_id: deviceId,
      install_referrer: { raw: "gclid=AbC.123", gclid: "AbC.123" },
    });
  });

  it("keeps the body unchanged without a referrer", async () => {
    expect(await sentBody(null)).toEqual({ platform: "android", device_id: deviceId });
  });
});

describe("getDeferredLink with the SDK off", () => {
  const matchDisabled = async (referrer: string | null) => {
    jest.mocked(Application.getInstallReferrerAsync).mockResolvedValue(referrer as string);
    await getDeferredLink({
      apiKey: "key",
      appID: "app",
      shouldUseClipboard: false,
      baseUrl: "https://api.example.com",
      deviceId,
      userId: "u1",
      isEnabled: false,
    });
  };

  it("matches a click ID with the v1 body only", async () => {
    await matchDisabled("utm_source=google&click_id=x");
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body,
    );
    expect(body).toEqual({ clickId: "x" });
  });

  it("sends nothing without a click ID", async () => {
    await matchDisabled("gclid=AbC.123");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
