import { buildAnalyticsBody, sendAnalytics } from "../send";

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

describe("sendAnalytics errors", () => {
  it("logs the API error body, not only the status", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: "currency must be an ISO 4217 code, e.g. USD",
        code: "invalid_currency",
      }),
    })) as unknown as typeof fetch;

    await sendAnalytics(
      { kind: "retention", name: "app_open" },
      {
        config: { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" },
        deviceId: "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01",
        userId: null,
      },
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[400] currency must be an ISO 4217 code, e.g. USD (invalid_currency)",
      ),
    );
    warn.mockRestore();
  });
});
