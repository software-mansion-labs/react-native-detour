import { Platform } from "react-native";

import * as Application from "expo-application";

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

  it("is null outside Android without asking for the referrer", async () => {
    Platform.OS = "ios";

    expect(await readInstallReferrer()).toBeNull();
    expect(referrer).not.toHaveBeenCalled();
  });

  it("retries once when the Play Store service is unavailable", async () => {
    jest.useFakeTimers();
    referrer
      .mockRejectedValueOnce(
        Object.assign(new Error("unavailable"), { code: "ERR_APPLICATION_INSTALL_REFERRER" }),
      )
      .mockResolvedValueOnce("utm_source=google");

    const result = readInstallReferrer();
    await jest.runAllTimersAsync();

    expect((await result)?.installReferrer.utm).toEqual({ source: "google" });
    expect(referrer).toHaveBeenCalledTimes(2);
  });

  it("warns and gives up on other errors", async () => {
    referrer.mockRejectedValue(
      Object.assign(new Error("no Play Store"), {
        code: "ERR_APPLICATION_INSTALL_REFERRER_UNAVAILABLE",
      }),
    );

    expect(await readInstallReferrer()).toBeNull();
    expect(referrer).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Could not read the install referrer"),
      expect.any(Error),
    );
  });

  it("is null for an empty referrer", async () => {
    referrer.mockResolvedValue("  ");

    expect(await readInstallReferrer()).toBeNull();
  });
});
