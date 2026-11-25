import {
  getRouteFromDeepLink,
  isShortLinkUrl,
  looksLikeUrl,
  normalizeRawLink,
  parsePathLink,
} from "../urlHelpers";

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

describe("isShortLinkUrl", () => {
  it.each([
    "https://acme.godetour.link/abc123",
    "https://acme.godetour.link/afcsvjRbhL051ksk",
    "https://go.brand.com/afcsvjRbhL051ksk?utm_source=x",
    "https://acme.godetour.link/afcsvjRbhL051ksk/",
    "http://acme.godetour.link/afcsvjRbhL051ksk",
    // Known false positive: the server answers 404, which the SDK treats like any unresolved link.
    "https://brand.com/abc123",
  ])("accepts %s", (url) => {
    expect(isShortLinkUrl(new URL(url))).toBe(true);
  });

  it.each([
    "https://acme.godetour.link/afcsvjRbhL",
    "https://acme.godetour.link/ABC123",
    "https://acme.godetour.link/afcsvjRbhL051kSk",
    "https://acme.godetour.link/afcsvj-bhL051ksk",
    "https://brand.com/promo",
    "https://acme.godetour.link/afcsvjRbhL/details",
    "https://acme.godetour.link/",
    "myapp://abc123",
    "myapp:///abc123",
  ])("rejects %s", (url) => {
    expect(isShortLinkUrl(new URL(url))).toBe(false);
  });
});
