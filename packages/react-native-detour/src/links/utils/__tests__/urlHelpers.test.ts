import {
  getRouteFromDeepLink,
  isInfrastructureUrl,
  looksLikeUrl,
  normalizeRawLink,
  parsePathLink,
  stripDevLaunchParams,
} from "../urlHelpers";

describe("isInfrastructureUrl", () => {
  it("detects Expo development launch URLs", () => {
    expect(
      isInfrastructureUrl(
        "myapp://?__expo_url=http%3A%2F%2F192.168.0.5%3A8081&__expo_disable_fab=1&__expo_disable_onboarding=1",
      ),
    ).toBe(true);
    expect(
      isInfrastructureUrl("myapp://expo-development-client/?url=http%3A%2F%2F192.168.0.5%3A8081"),
    ).toBe(true);
    expect(isInfrastructureUrl("exp://192.168.0.5:8081")).toBe(true);
  });

  it("keeps app links", () => {
    expect(isInfrastructureUrl("https://org.godetour.link/hash/details?id=1")).toBe(false);
    expect(isInfrastructureUrl("myapp://details?id=1&__expo_disable_fab=1")).toBe(false);
    expect(isInfrastructureUrl("myapp://details?return_url=x")).toBe(false);
  });
});

describe("stripDevLaunchParams", () => {
  it("removes reserved __expo_* params", () => {
    expect(stripDevLaunchParams("myapp://details?id=1&__expo_disable_fab=1")).toBe(
      "myapp://details?id=1",
    );
    expect(stripDevLaunchParams("myapp://details?__expo_disable_fab=1#top")).toBe(
      "myapp://details#top",
    );
  });

  it("returns links without reserved params unchanged", () => {
    expect(stripDevLaunchParams("https://org.godetour.link/hash/p?x=1&y=2#top")).toBe(
      "https://org.godetour.link/hash/p?x=1&y=2#top",
    );
    expect(stripDevLaunchParams("myapp://details")).toBe("myapp://details");
  });
});

describe("looksLikeUrl", () => {
  it("accepts strings that start with a scheme or //", () => {
    expect(looksLikeUrl("https://example.com/hash/p")).toBe(true);
    expect(looksLikeUrl("HTTPS://example.com/hash/p")).toBe(true);
    expect(looksLikeUrl("myapp://product/1")).toBe(true);
    expect(looksLikeUrl("myapp:product/1?x=1")).toBe(true);
    expect(looksLikeUrl("//example.com/hash/p")).toBe(true);
  });

  it("treats a ':' after the first path character as part of a path", () => {
    expect(looksLikeUrl("/hash/p?redirect=https://x.com/y")).toBe(false);
    expect(looksLikeUrl("/hash/product:1?x=1")).toBe(false);
    expect(looksLikeUrl("hash/time/12:30?x=1")).toBe(false);
    expect(looksLikeUrl("/hash/urn:isbn:123")).toBe(false);
  });
});

describe("normalizeRawLink", () => {
  it("adds https to protocol-relative links", () => {
    expect(normalizeRawLink("//example.com/hash/p")).toBe("https://example.com/hash/p");
    expect(normalizeRawLink("myapp://product/1")).toBe("myapp://product/1");
  });
});

describe("parsePathLink", () => {
  it("drops the fragment", () => {
    const link = parsePathLink("/hash/p?x=1#top");
    expect(link.route).toBe("/p?x=1");
    expect(link.pathname).toBe("/p");
    expect(link.params).toEqual({ x: "1" });
  });

  it("keeps ':' and '?' inside the query", () => {
    const link = parsePathLink("/hash/p?redirect=https://x.com/y?z=1");
    expect(link.route).toBe("/p?redirect=https://x.com/y?z=1");
    expect(link.params).toEqual({ redirect: "https://x.com/y?z=1" });
  });

  it("keeps ':' inside the path", () => {
    expect(parsePathLink("hash/time/12:30?x=1").route).toBe("/time/12:30?x=1");
    expect(parsePathLink("/hash/urn:isbn:123").route).toBe("/urn:isbn:123");
  });

  it("decodes params like URLSearchParams", () => {
    expect(parsePathLink("/hash/p?a=hello+50%off&b=100%25%off&=5").params).toEqual({
      a: "hello 50%off",
      b: "100%%off",
      "": "5",
    });
  });
});

describe("getRouteFromDeepLink", () => {
  it("keeps the host, path and query percent-encoded", () => {
    const url = new URL("myapp://a%3Fb/product/hello%20world?q=a%26b#top");
    expect(getRouteFromDeepLink(url)).toBe("/a%3Fb/product/hello%20world?q=a%26b");
  });

  it("handles links without //", () => {
    expect(getRouteFromDeepLink(new URL("myapp:product/1?x=1#top"))).toBe("/product/1?x=1");
  });
});
