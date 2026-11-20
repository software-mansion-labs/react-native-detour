import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

beforeAll(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
});

const loadModules = () => {
  let status!: typeof import("../status");
  let consent!: typeof import("../consent");
  let sdkConfig!: typeof import("../sdkConfig");
  let startModule!: typeof import("../../start");
  jest.isolateModules(() => {
    status = require("../status");
    consent = require("../consent");
    sdkConfig = require("../sdkConfig");
    startModule = require("../../start");
  });
  return { ...status, ...consent, ...sdkConfig, start: startModule.start };
};

jest.spyOn(console, "warn").mockImplementation(() => {});

it("reports the start, the consent of this launch and each purpose's decision", async () => {
  const sdk = loadModules();
  sdk.configureSdkConfig(memoryStorage().storage, "app");
  await sdk.applySdkConfig(
    { schema_version: 1, consent_gate_default: { analytics: "closed", partner_x: "open" } },
    null,
  );

  expect(await sdk.getStatus()).toEqual({
    isStarted: false,
    isEnabled: true,
    hasConsentThisLaunch: false,
    purposes: {
      analytics: "wait",
      attribution: "wait",
      ad_network_sharing: "wait",
      ad_personalization: "wait",
      partner_x: "send",
    },
  });

  sdk.start();
  sdk.setConsent({ purposes: { analytics: true } });

  expect(await sdk.getStatus()).toMatchObject({
    isStarted: true,
    hasConsentThisLaunch: true,
    purposes: { analytics: "send", attribution: "drop", partner_x: "drop" },
  });
});
