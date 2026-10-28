import { claimOpenForProvider, forgetLinkOpens, markOpenedByNativeIntent } from "../linkOpens";

const LINK = "https://myapp.godetour.link/abc123/product/42";

let now = 0;

beforeEach(() => {
  forgetLinkOpens();
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("claimOpenForProvider", () => {
  it("skips a link the native intent routed", async () => {
    markOpenedByNativeIntent(LINK, Promise.resolve(true));
    now += 1500;

    expect(await claimOpenForProvider(LINK)).toBe(false);
  });

  it("delivers a link the native intent could not route", async () => {
    markOpenedByNativeIntent(LINK, Promise.resolve(false));

    expect(await claimOpenForProvider(LINK)).toBe(true);
  });

  it("waits for the native intent to finish routing", async () => {
    let finishRouting!: (handled: boolean) => void;
    markOpenedByNativeIntent(LINK, new Promise((resolve) => (finishRouting = resolve)));

    const claim = claimOpenForProvider(LINK);
    finishRouting(false);

    expect(await claim).toBe(true);
  });

  it("delivers a fallen-back link only once when it arrives twice", async () => {
    markOpenedByNativeIntent(LINK, Promise.resolve(false));

    const claims = await Promise.all([claimOpenForProvider(LINK), claimOpenForProvider(LINK)]);

    expect(claims).toEqual([true, false]);
  });

  it("delivers the link when the native intent routed it long ago", async () => {
    markOpenedByNativeIntent(LINK, Promise.resolve(true));
    now += 10_000;

    expect(await claimOpenForProvider(LINK)).toBe(true);
  });

  it("skips the same tap delivered twice", async () => {
    expect(await claimOpenForProvider(LINK)).toBe(true);
    now += 500;

    expect(await claimOpenForProvider(LINK)).toBe(false);
  });

  it("delivers the link again when the user taps it again", async () => {
    expect(await claimOpenForProvider(LINK)).toBe(true);
    now += 1000;

    expect(await claimOpenForProvider(LINK)).toBe(true);
  });
});
