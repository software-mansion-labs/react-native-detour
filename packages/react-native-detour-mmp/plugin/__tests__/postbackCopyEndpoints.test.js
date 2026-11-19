const { addPostbackCopyEndpoints } = require("../postbackCopyEndpoints");

describe("addPostbackCopyEndpoints", () => {
  it("adds both keys and keeps the rest of Info.plist", () => {
    expect(addPostbackCopyEndpoints({ CFBundleName: "App" })).toEqual({
      infoPlist: {
        CFBundleName: "App",
        NSAdvertisingAttributionReportEndpoint: "https://godetour.dev",
        AttributionCopyEndpoint: "https://godetour.dev",
      },
      keptKeys: [],
    });
  });

  it("keeps a key the app already sets and reports it", () => {
    const { infoPlist, keptKeys } = addPostbackCopyEndpoints({
      NSAdvertisingAttributionReportEndpoint: "https://other-provider.example",
      AttributionCopyEndpoint: "",
    });

    expect(infoPlist.NSAdvertisingAttributionReportEndpoint).toBe("https://other-provider.example");
    expect(infoPlist.AttributionCopyEndpoint).toBe("https://godetour.dev");
    expect(keptKeys).toEqual(["NSAdvertisingAttributionReportEndpoint"]);
  });

  it("reports nothing when the app already points the keys at Detour", () => {
    const { keptKeys } = addPostbackCopyEndpoints({
      NSAdvertisingAttributionReportEndpoint: "https://godetour.dev",
      AttributionCopyEndpoint: "https://godetour.dev",
    });

    expect(keptKeys).toEqual([]);
  });
});
