import { logConversion, logEvent } from "../analytics";
import { conversionProblem } from "../conversionCheck";
import type { DetourConversion } from "../types";
import { analyticsEmitter } from "../utils/analyticsEmitter";

const valid: DetourConversion = {
  name: "purchase",
  revenue: 9.99,
  currency: "usd",
  revenueType: "iap",
  productId: "pro",
  quantity: 1,
  transactionId: "t_1",
};

describe("conversionProblem", () => {
  it("accepts a conversion the backend takes", () => {
    expect(conversionProblem(valid)).toBeNull();
    expect(conversionProblem({ ...valid, revenue: 0, productId: undefined })).toBeNull();
  });

  it.each([
    [{ name: "" }, "name"],
    [{ name: "n".repeat(256) }, "name"],
    [{ revenue: NaN }, "revenue"],
    [{ revenue: -1 }, "revenue"],
    [{ revenue: 1_000_000_000_000 }, "revenue"],
    [{ currency: "dollars" }, "currency"],
    [{ revenueType: "subscription" }, "revenueType"],
    [{ productId: "p".repeat(256) }, "productId"],
    [{ quantity: 1.5 }, "quantity"],
    [{ quantity: -1 }, "quantity"],
    [{ transactionId: "" }, "transactionId"],
  ])("names the field for %j", (change, field) => {
    expect(conversionProblem({ ...valid, ...change } as DetourConversion)).toMatch(
      new RegExp(`^${field} `),
    );
  });
});

describe("DetourAnalytics", () => {
  const emitted = jest.fn();
  let unsubscribe: () => void;

  beforeEach(() => {
    emitted.mockClear();
    unsubscribe = analyticsEmitter.subscribe(emitted);
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    unsubscribe();
    jest.restoreAllMocks();
  });

  it("drops a conversion the backend would reject and says why", () => {
    logConversion({ ...valid, currency: "dollars" });

    expect(emitted).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("currency must be"));
  });

  it("warns once per event name about revenue in logEvent, for any event", () => {
    logEvent("ad_impression", { revenue: 0.01 });
    logEvent("ad_impression", { revenue: 0.02 });
    logEvent("refund", { revenue: 5 });

    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("logEvent('refund')"));
    expect(emitted).toHaveBeenCalledTimes(3);
  });
});
