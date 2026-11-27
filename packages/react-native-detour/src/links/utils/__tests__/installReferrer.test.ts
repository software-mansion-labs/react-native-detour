import { Platform } from "react-native";

import * as Application from "expo-application";

import { isFound } from "../../../attribution/referrerRead";
import { parseInstallReferrer, readInstallReferrer } from "../installReferrer";

jest.mock("expo-application", () => ({ getInstallReferrerAsync: jest.fn() }));

const CLICK_ID = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const referrer = jest.mocked(Application.getInstallReferrerAsync);

beforeEach(() => {
  referrer.mockReset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  Platform.OS = "ios";
});

describe("parseInstallReferrer", () => {
  it("reads every field and keeps the gclid case", () => {
    const raw = `utm_source=google&utm_medium=cpc&gclid=AbC.123&click_id=${CLICK_ID}`;

    expect(parseInstallReferrer(raw)).toEqual({
      clickId: CLICK_ID,
      installReferrer: { raw, utm: { source: "google", medium: "cpc" }, gclid: "AbC.123" },
    });
  });

  it("leaves out utm and gclid when the referrer has none", () => {
    expect(parseInstallReferrer(`click_id=${CLICK_ID}`)).toEqual({
      clickId: CLICK_ID,
      installReferrer: { raw: `click_id=${CLICK_ID}` },
    });
  });

  it("keeps an encoded & or = inside its value", () => {
    const { installReferrer } = parseInstallReferrer("utm_campaign=Q4%20%26%20sale&utm_term=a%3Db");

    expect(installReferrer.utm).toEqual({ campaign: "Q4 & sale", term: "a=b" });
  });

  it("reads + as a space and %2B as a plus, as Android does", () => {
    const { installReferrer } = parseInstallReferrer("utm_campaign=spring+sale&utm_term=c%2B%2B");

    expect(installReferrer.utm).toEqual({ campaign: "spring sale", term: "c++" });
  });

  it("decodes a referrer encoded twice", () => {
    const raw = `utm_source%3Dgoogle%26click_id%3D${CLICK_ID}`;

    expect(parseInstallReferrer(raw)).toEqual({
      clickId: CLICK_ID,
      installReferrer: { raw, utm: { source: "google" } },
    });
  });

  it("ignores a leading ?", () => {
    expect(parseInstallReferrer("?utm_source=google").installReferrer.utm).toEqual({
      source: "google",
    });
  });

  it("uses only a UUID click ID, in any case", () => {
    expect(parseInstallReferrer("click_id=null").clickId).toBeNull();
    expect(parseInstallReferrer("click_id=abc").clickId).toBeNull();
    expect(parseInstallReferrer(`click_id=${CLICK_ID.toUpperCase()}`).clickId).toBe(
      CLICK_ID.toUpperCase(),
    );
  });

  it("parses a referrer that is not URL-encoded correctly", () => {
    const { clickId, installReferrer } = parseInstallReferrer(
      `utm_campaign=50%&click_id=${CLICK_ID}`,
    );

    expect(clickId).toBe(CLICK_ID);
    expect(installReferrer.utm).toEqual({ campaign: "50%" });
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("readInstallReferrer", () => {
  beforeEach(() => {
    Platform.OS = "android";
  });

  const playError = (code: string) => Object.assign(new Error(code), { code });

  it("is none outside Android without asking for the referrer", async () => {
    Platform.OS = "ios";

    expect(await readInstallReferrer()).toBe("none");
    expect(referrer).not.toHaveBeenCalled();
  });

  it("retries twice, 3 s apart, when the Play Store service fails", async () => {
    jest.useFakeTimers();
    referrer
      .mockRejectedValueOnce(playError("ERR_APPLICATION_INSTALL_REFERRER"))
      .mockRejectedValueOnce(playError("ERR_APPLICATION_INSTALL_REFERRER_REMOTE_EXCEPTION"))
      .mockResolvedValueOnce("utm_source=google");

    const result = readInstallReferrer();
    await jest.advanceTimersByTimeAsync(2_999);
    expect(referrer).toHaveBeenCalledTimes(1);
    await jest.runAllTimersAsync();

    const read = await result;
    expect(isFound(read) && read.found.installReferrer.utm).toEqual({
      source: "google",
    });
    expect(referrer).toHaveBeenCalledTimes(3);
  });

  it("is failed when the service still fails, so it is read again later", async () => {
    jest.useFakeTimers();
    referrer.mockRejectedValue(playError("ERR_APPLICATION_INSTALL_REFERRER_SERVICE_DISCONNECTED"));

    const result = readInstallReferrer();
    await jest.runAllTimersAsync();

    expect(await result).toBe("failed");
    expect(referrer).toHaveBeenCalledTimes(3);
  });

  it("warns and gives up without the Play Store", async () => {
    referrer.mockRejectedValue(playError("ERR_APPLICATION_INSTALL_REFERRER_UNAVAILABLE"));

    expect(await readInstallReferrer()).toBe("none");
    expect(referrer).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Could not read the install referrer"),
      expect.any(Error),
    );
  });

  it("is none for an empty referrer", async () => {
    referrer.mockResolvedValue("  ");

    expect(await readInstallReferrer()).toBe("none");
  });
});
