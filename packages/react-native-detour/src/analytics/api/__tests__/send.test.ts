import { buildAnalyticsBody } from "../send";

jest.mock("../../../net/requestContext", () => ({ getRequestContext: async () => ({}) }));

describe("conversion body", () => {
  it("sends the contract fields", async () => {
    const body = await buildAnalyticsBody(
      {
        kind: "conversion",
        conversion: {
          name: "ad_impression",
          revenue: 0.001234,
          currency: "USD",
          revenueType: "in_app_ads",
          transactionId: "t_1",
        },
        at: 1_730_000_000_000,
      },
      "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01",
      null,
    );

    expect(JSON.parse(JSON.stringify(body))).toEqual({
      name: "ad_impression",
      revenue: 0.001234,
      currency: "USD",
      revenue_type: "in_app_ads",
      transaction_id: "t_1",
      timestamp: "2024-10-27T03:33:20.000Z",
      device_id: "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01",
    });
  });
});
