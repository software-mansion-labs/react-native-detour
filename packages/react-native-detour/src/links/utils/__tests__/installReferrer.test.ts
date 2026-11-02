import { parseInstallReferrer } from "../installReferrer";

describe("parseInstallReferrer", () => {
  it("reads every field and keeps the gclid case", () => {
    const raw = "utm_source=google&utm_medium=cpc&gclid=AbC.123&click_id=x";

    expect(parseInstallReferrer(raw)).toEqual({
      clickId: "x",
      installReferrer: { raw, utm: { source: "google", medium: "cpc" }, gclid: "AbC.123" },
    });
  });

  it("leaves out utm and gclid when the referrer has none", () => {
    expect(parseInstallReferrer("click_id=x")).toEqual({
      clickId: "x",
      installReferrer: { raw: "click_id=x" },
    });
  });

  it("parses a referrer that is not URL-encoded correctly", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseInstallReferrer("utm_campaign=50%&click_id=x").clickId).toBe("x");
  });
});
