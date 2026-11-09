import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { ConsentWire } from "../../consent/types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const MARKER = "@swmansion/react-native-detour-mmp/marker";

const wire = (purposes: Record<string, boolean>): ConsentWire => ({
  purposes,
  timestamp: "2025-10-14T12:00:00.000Z",
});

const loadModules = () => {
  let sdkPackage!: typeof import("../sdkPackage");
  let consent!: typeof import("../../consent/consent");
  let sdkConfig!: typeof import("../../consent/sdkConfig");
  jest.isolateModules(() => {
    sdkPackage = require("../sdkPackage");
    consent = require("../../consent/consent");
    sdkConfig = require("../../consent/sdkConfig");
  });
  return { ...sdkPackage, ...consent, ...sdkConfig };
};

afterEach(() => {
  jest.dontMock(MARKER);
});

// In this monorepo the package may be resolvable, so its absence is simulated.
describe("without the attribution package", () => {
  beforeEach(() => {
    jest.doMock(
      MARKER,
      () => {
        throw new Error("Cannot find module");
      },
      { virtual: true },
    );
  });

  it("is core even with consent for attribution", async () => {
    const { INSTALLED_PACKAGE, setConsent, sdkPackageForRequest } = loadModules();
    setConsent({ purposes: { attribution: true } });

    expect(INSTALLED_PACKAGE).toBe("core");
    expect(await sdkPackageForRequest()).toBe("core");
  });
});

describe("with the attribution package", () => {
  beforeEach(() => {
    jest.doMock(MARKER, () => ({}), { virtual: true });
  });

  it("is mmp once consent for attribution is passed on this launch", async () => {
    const { INSTALLED_PACKAGE, setConsent, sdkPackageForRequest } = loadModules();
    setConsent({ purposes: { attribution: true } });

    expect(INSTALLED_PACKAGE).toBe("mmp");
    expect(await sdkPackageForRequest()).toBe("mmp");
  });

  it("is core before consent, with a refusal, or with consent for other purposes only", async () => {
    const { setConsent, sdkPackageForRequest } = loadModules();
    expect(await sdkPackageForRequest()).toBe("core");

    setConsent({ purposes: { attribution: false } });
    expect(await sdkPackageForRequest()).toBe("core");

    setConsent({ purposes: { analytics: true } });
    expect(await sdkPackageForRequest()).toBe("core");
  });

  it("does not trust a grant stored on an earlier launch", async () => {
    const { storage, items } = memoryStorage();
    items.set("Detour_consent", JSON.stringify(wire({ attribution: true })));
    const { configureConsent, sdkPackageForRequest } = loadModules();
    configureConsent(storage, { apiKey: "key", appID: "app" }, async () => ({
      deviceId: "device",
      userId: null,
    }));

    expect(await sdkPackageForRequest()).toBe("core");
  });

  it("is mmp without consent only when the server opens the attribution gate", async () => {
    const { applySdkConfig, configureSdkConfig, sdkPackageForRequest } = loadModules();
    configureSdkConfig(memoryStorage().storage, "app");
    await applySdkConfig(
      { schema_version: 1, consent_gate_default: { attribution: "open" } },
      null,
    );

    expect(await sdkPackageForRequest()).toBe("mmp");
  });
});
