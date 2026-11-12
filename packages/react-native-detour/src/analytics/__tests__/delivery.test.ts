import type { AnalyticsRequest } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const closedAnalytics = {
  schema_version: 1,
  consent_gate_default: { analytics: "closed" },
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const event: AnalyticsRequest = { kind: "event", name: "login", at: 0 };

// Fresh modules with analytics closed on the server and a sender to observe.
const setUp = async () => {
  let delivery!: typeof import("../delivery");
  let consent!: typeof import("../../consent/consent");
  let sdkConfig!: typeof import("../../consent/sdkConfig");
  let changes!: typeof import("../../consent/changes");
  jest.isolateModules(() => {
    changes = require("../../consent/changes");
    delivery = require("../delivery");
    consent = require("../../consent/consent");
    sdkConfig = require("../../consent/sdkConfig");
  });
  const storage = { getItem: () => null, setItem: () => {} };
  sdkConfig.configureSdkConfig(storage, "app");
  await sdkConfig.applySdkConfig(closedAnalytics, null);
  consent.configureConsent(storage, { apiKey: "key", appID: "app" }, async () => ({
    deviceId: "device",
    userId: null,
  }));
  changes.onConsentInputsChange(delivery.reevaluateWaiting);
  const send = jest.fn(async () => {});
  delivery.setAnalyticsSender(send);
  return { delivery, consent, send };
};

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
});

it("keeps requests until consent decides them", async () => {
  const { delivery, consent, send } = await setUp();

  await delivery.deliverAnalytics(event);
  expect(send).not.toHaveBeenCalled();

  consent.setConsent({ purposes: { analytics: true } });
  await flush();
  expect(send).toHaveBeenCalledWith(event);
});

it("drops waiting requests when consent is refused", async () => {
  const { delivery, consent, send } = await setUp();

  await delivery.deliverAnalytics(event);
  consent.setConsent({ purposes: { analytics: false } });
  await flush();
  consent.setConsent({ purposes: { analytics: true } });
  await flush();

  expect(send).not.toHaveBeenCalled();
});
