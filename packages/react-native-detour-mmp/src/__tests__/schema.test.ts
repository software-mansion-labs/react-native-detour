import type { DetourConversion } from "@swmansion/react-native-detour";

import { type ConversionValueRule, bestRule, parseSchema } from "../conversionValue/schema";

const purchase = (revenue: number, currency = "USD"): DetourConversion => ({
  name: "purchase",
  revenue,
  currency,
  revenueType: "iap",
});

const best = (rules: ConversionValueRule[], conversion: DetourConversion, count = 1) =>
  bestRule({ version: 1, rules }, conversion, count)?.fine ?? null;

describe("bestRule", () => {
  it("takes the highest fine, and the higher priority on a tie", () => {
    const rules: ConversionValueRule[] = [
      { event: "purchase", fine: 5 },
      { event: "purchase", fine: 20, coarse: "low", priority: 1 },
      { event: "purchase", fine: 20, coarse: "high", priority: 2 },
      { event: "signup", fine: 40 },
    ];

    expect(bestRule({ version: 1, rules }, purchase(1), 1)?.coarse).toBe("high");
  });

  it("matches revenue in the rule's currency only", () => {
    const rules: ConversionValueRule[] = [
      { event: "purchase", fine: 10, condition: { revenue_gte: 5, currency: "USD" } },
    ];

    expect(best(rules, purchase(5))).toBe(10);
    expect(best(rules, purchase(4.99))).toBeNull();
    expect(best(rules, purchase(50, "PLN"))).toBeNull();
    expect(
      best([{ event: "purchase", fine: 10, condition: { revenue_gte: 5 } }], purchase(50, "PLN")),
    ).toBe(10);
  });

  it("counts this conversion for count_gte", () => {
    const rules: ConversionValueRule[] = [
      { event: "purchase", fine: 7, condition: { count_gte: 2 } },
    ];

    expect(best(rules, purchase(1), 1)).toBeNull();
    expect(best(rules, purchase(1), 2)).toBe(7);
  });

  it("skips a fine outside 0-63", () => {
    expect(best([{ event: "purchase", fine: 64 }], purchase(1))).toBeNull();
  });
});

describe("parseSchema", () => {
  it("reads a schema with nulls for missing fields", () => {
    expect(
      parseSchema({
        version: null,
        rules: [{ event: "purchase", fine: 3, coarse: null, lock: null, condition: null }],
      }),
    ).toEqual({
      version: null,
      rules: [{ event: "purchase", fine: 3, coarse: null, lock: null, condition: null }],
    });
  });

  it("rejects a body that is not a schema", () => {
    expect(parseSchema(null)).toBeNull();
    expect(parseSchema({ rules: "none" })).toBeNull();
    expect(parseSchema({ rules: [{ event: "purchase", fine: 2.5 }] })).toBeNull();
    expect(parseSchema({ rules: [{ event: "purchase", fine: 2, coarse: "top" }] })).toBeNull();
    expect(
      parseSchema({ rules: [{ event: "purchase", fine: 2, condition: { revenue_gte: "10" } }] }),
    ).toBeNull();
  });
});
