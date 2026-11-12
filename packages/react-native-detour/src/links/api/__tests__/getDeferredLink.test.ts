import { Platform } from "react-native";

import * as Application from "expo-application";

import { getDeferredLink } from "../getDeferredLink";

jest.mock("expo-application", () => ({ getInstallReferrerAsync: jest.fn() }));
jest.mock("../../utils/matchSignals", () => ({
  buildDirectMatchRequest: (clickId: string) => ({ clickId }),
  buildSignalMatchRequest: jest.fn(async () => ({ platform: "android" })),
}));

const deviceId = "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01";
const CLICK_ID = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const fetchMock = jest.fn(async (_url: string, _init: RequestInit) => ({
  ok: false,
  status: 404,
  json: async () => ({}),
}));

const sentBody = async (referrer: string | null) => {
  if (referrer === null) {
    jest.mocked(Application.getInstallReferrerAsync).mockRejectedValue(new Error("no referrer"));
  } else {
    jest.mocked(Application.getInstallReferrerAsync).mockResolvedValue(referrer);
  }
  await getDeferredLink({
    apiKey: "key",
    appID: "app",
    shouldUseClipboard: false,
    baseUrl: "https://api.example.com",
    deviceId,
    userId: null,
  });
  return JSON.parse(fetchMock.mock.calls[0]![1].body as string);
};

beforeEach(() => {
  fetchMock.mockClear();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "warn").mockImplementation(() => {});
  Platform.OS = "android";
});

afterEach(() => {
  jest.restoreAllMocks();
  Platform.OS = "ios";
});

describe("getDeferredLink install_referrer", () => {
  it("sends the referrer with the click ID match", async () => {
    const raw = `utm_source=google&click_id=${CLICK_ID}`;

    expect(await sentBody(raw)).toEqual({
      clickId: CLICK_ID,
      device_id: deviceId,
      install_referrer: { raw, utm: { source: "google" } },
    });
  });

  it("sends the referrer with signal matching when it has no click ID", async () => {
    expect(await sentBody("gclid=AbC.123")).toEqual({
      platform: "android",
      device_id: deviceId,
      install_referrer: { raw: "gclid=AbC.123", gclid: "AbC.123" },
    });
  });

  it("uses signal matching for a click ID that is not a UUID", async () => {
    expect(await sentBody("click_id=null")).toEqual({
      platform: "android",
      device_id: deviceId,
      install_referrer: { raw: "click_id=null" },
    });
  });

  it("keeps the body unchanged without a referrer", async () => {
    expect(await sentBody(null)).toEqual({ platform: "android", device_id: deviceId });
  });
});
