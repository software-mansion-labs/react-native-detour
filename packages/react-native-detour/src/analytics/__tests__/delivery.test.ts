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
  let startModule!: typeof import("../../start");
  jest.isolateModules(() => {
    startModule = require("../../start");
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
  return { delivery, consent, send, start: startModule.start };
};

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
});

it("keeps requests until consent decides them", async () => {
  const { delivery, consent, send, start } = await setUp();
  start();

  await delivery.deliverAnalytics(event);
  expect(send).not.toHaveBeenCalled();

  consent.setConsent({ purposes: { analytics: true } });
  await flush();
  expect(send).toHaveBeenCalledWith(event);
});

it("drops waiting requests when consent is refused", async () => {
  const { delivery, consent, send, start } = await setUp();
  start();

  await delivery.deliverAnalytics(event);
  consent.setConsent({ purposes: { analytics: false } });
  await flush();
  consent.setConsent({ purposes: { analytics: true } });
  await flush();

  expect(send).not.toHaveBeenCalled();
});

it("keeps requests logged before the start, and lets the gate decide them after it", async () => {
  const { delivery, consent, send, start } = await setUp();
  consent.setConsent({ purposes: { analytics: true } });

  await delivery.deliverAnalytics(event);
  await flush();
  expect(send).not.toHaveBeenCalled();

  start();
  await flush();
  expect(send).toHaveBeenCalledWith(event);
});

it("keeps at most 100 requests before the start, like a closed gate", async () => {
  const { delivery, consent, send, start } = await setUp();
  consent.setConsent({ purposes: { analytics: true } });

  for (let at = 0; at < 101; at++) await delivery.deliverAnalytics({ ...event, at });
  start();
  await flush();

  expect(send).toHaveBeenCalledTimes(100);
  expect(send).not.toHaveBeenCalledWith({ ...event, at: 100 });
});
