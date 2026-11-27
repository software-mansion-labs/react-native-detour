import { Platform } from "react-native";

import * as Application from "expo-application";

import { attributionMatchFieldsFor } from "../../../attribution/attributionMode";
import { lateMetaReadHooks, trackFirstRead } from "../../../attribution/lateReferrers";
import { sdkPackageForRequest } from "../../../attribution/sdkPackage";
import { buildSignalMatchRequest } from "../../utils/matchSignals";
import { getDeferredLink } from "../getDeferredLink";

jest.mock("../../../net/requestContext", () => ({ getRequestContext: async () => ({}) }));
jest.mock("expo-application", () => ({ getInstallReferrerAsync: jest.fn() }));
jest.mock("../../../attribution/sdkPackage", () => ({
  sdkPackageForRequest: jest.fn(async () => "core"),
}));
jest.mock("../../../attribution/attributionMode", () => ({
  attributionMatchFieldsFor: jest.fn(async () => ({})),
}));
const mockMetaHooks = { started: jest.fn(), answered: jest.fn(), answeredLate: jest.fn() };
jest.mock("../../../attribution/lateReferrers", () => ({
  trackFirstRead: jest.fn((_name: string, read: () => Promise<unknown>) => read()),
  lateMetaReadHooks: jest.fn(() => mockMetaHooks),
}));
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
    await matchDisabled(`utm_source=google&click_id=${CLICK_ID}`);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toEqual({ clickId: CLICK_ID });
  });

  it("sends nothing without a click ID", async () => {
    await matchDisabled("gclid=AbC.123");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getDeferredLink attribution fields", () => {
  const send = async () => {
    jest.mocked(Application.getInstallReferrerAsync).mockRejectedValue(new Error("no referrer"));
    await getDeferredLink({
      apiKey: "key",
      appID: "app",
      shouldUseClipboard: false,
      baseUrl: "https://api.example.com",
      deviceId,
      userId: null,
    });
    const init = fetchMock.mock.calls[0]![1];
    return {
      body: JSON.parse(init.body as string),
      sdkPackage: (init.headers as Record<string, string>)["X-SDK-Package"],
    };
  };

  it("sends the fields with the package they were asked for", async () => {
    const metaReferrer = {
      install_referrer: "encrypted",
      is_ct: true,
      actual_timestamp: 1_700_000_000,
      source_app: "instagram" as const,
    };
    jest.mocked(sdkPackageForRequest).mockResolvedValueOnce("mmp");
    jest.mocked(attributionMatchFieldsFor).mockResolvedValueOnce({
      asa_token: "token",
      meta_install_referrer: metaReferrer,
    });

    const { body, sdkPackage } = await send();

    expect(sdkPackage).toBe("mmp");
    expect(body.asa_token).toBe("token");
    expect(body.meta_install_referrer).toEqual(metaReferrer);
    expect(attributionMatchFieldsFor).toHaveBeenCalledWith("mmp", mockMetaHooks);
  });

  it("sends core without a token", async () => {
    const { body, sdkPackage } = await send();

    expect(sdkPackage).toBe("core");
    expect(body).not.toHaveProperty("asa_token");
    expect(body).not.toHaveProperty("meta_install_referrer");
    expect(attributionMatchFieldsFor).toHaveBeenCalledWith("core", expect.anything());
  });
});

describe("getDeferredLink late referrers", () => {
  it("reads the Play referrer and Meta's through the late referrer module", async () => {
    jest.mocked(Application.getInstallReferrerAsync).mockResolvedValue("utm_source=google");

    await getDeferredLink({
      apiKey: "key",
      appID: "app",
      shouldUseClipboard: false,
      baseUrl: "https://api.example.com",
      deviceId,
      userId: null,
    });

    expect(trackFirstRead).toHaveBeenCalledWith("play", expect.any(Function));
    expect(lateMetaReadHooks).toHaveBeenCalledWith(deviceId, expect.any(Promise));
  });
});

describe("getDeferredLink timing", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("reads the attribution fields while the signals are collected", async () => {
    jest.useFakeTimers();
    const after = <T>(ms: number, value: T) =>
      new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
    jest.mocked(Application.getInstallReferrerAsync).mockRejectedValue(new Error("no referrer"));
    jest.mocked(sdkPackageForRequest).mockResolvedValueOnce("mmp");
    jest.mocked(attributionMatchFieldsFor).mockImplementationOnce(() => after(1_500, {}));
    jest
      .mocked(buildSignalMatchRequest)
      .mockImplementationOnce(() => after(1_000, { platform: "android" }) as never);

    const link = getDeferredLink({
      apiKey: "key",
      appID: "app",
      shouldUseClipboard: false,
      baseUrl: "https://api.example.com",
      deviceId,
      userId: null,
    });
    await jest.advanceTimersByTimeAsync(1_500);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await link;
  });
});
