import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { AnalyticsRequest } from "../../analytics/types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

beforeAll(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
});

const closedGate = {
  schema_version: 1,
  consent_gate_default: { analytics: "closed", attribution: "closed" },
};
const event: AnalyticsRequest = { kind: "event", name: "login", at: 0 };

// Fresh modules, so each launch starts with no warnings given, and a closed gate.
const launch = async (stored: Record<string, string> = {}) => {
  let consent!: typeof import("../consent");
  let consentGate!: typeof import("../consentGate");
  let sdkConfig!: typeof import("../sdkConfig");
  let delivery!: typeof import("../../analytics/delivery");
  let startModule!: typeof import("../../start");
  jest.isolateModules(() => {
    consent = require("../consent");
    consentGate = require("../consentGate");
    sdkConfig = require("../sdkConfig");
    delivery = require("../../analytics/delivery");
    startModule = require("../../start");
  });
  const { storage } = memoryStorage(stored);
  sdkConfig.configureSdkConfig(storage, "app");
  await sdkConfig.applySdkConfig(closedGate, null);
  consent.configureConsent(storage, { apiKey: "key", appID: "app" }, async () => ({
    deviceId: "device",
    userId: null,
  }));
  delivery.setAnalyticsSender(jest.fn(async () => {}));
  return { ...consent, ...consentGate, ...delivery, start: startModule.start };
};

// Each case runs its pitfall twice on one launch.
const pitfalls: Record<string, () => Promise<void>> = {
  "setConsent without start()": async () => {
    const sdk = await launch();
    sdk.setConsent({ purposes: { analytics: true } });
    sdk.setConsent({ purposes: { analytics: true } });
    jest.advanceTimersByTime(sdk.START_AFTER_CONSENT_GRACE_MS);
  },
  "no analytics key": async () => {
    const sdk = await launch();
    sdk.start();
    sdk.setConsent({ purposes: { attribution: true } });
    sdk.setConsent({ purposes: { attribution: false } });
  },
  "analytics waits for consent": async () => {
    const sdk = await launch();
    sdk.start();
    await sdk.deliverAnalytics(event);
    await sdk.deliverAnalytics(event);
  },
  "stored grant not passed again": async () => {
    const sdk = await launch({
      Detour_consent: JSON.stringify({
        purposes: { analytics: true },
        timestamp: "2025-10-14T12:00:00.000Z",
      }),
    });
    sdk.start();
    await sdk.deliverAnalytics(event);
    await sdk.deliverAnalytics(event);
  },
};

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
const consentWarnings = () =>
  warn.mock.calls.filter(([message]) => String(message).startsWith("🔗[Detour:CONSENT]"));

beforeEach(() => {
  jest.useFakeTimers();
  warn.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
});

describe.each(Object.entries(pitfalls))("%s", (_name, trigger) => {
  it("warns once in a development build", async () => {
    await trigger();
    expect(consentWarnings()).toHaveLength(1);
  });

  it("never warns in a production build", async () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    await trigger();
    expect(consentWarnings()).toHaveLength(0);
  });
});
