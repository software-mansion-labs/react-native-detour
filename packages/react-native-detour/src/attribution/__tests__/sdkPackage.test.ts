import { fakeAttributionProvider } from "../../__fixtures__/attributionProvider";
import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { ConsentWire } from "../../consent/types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const MARKER = "@swmansion/react-native-detour-mmp/marker";

const provider = fakeAttributionProvider();

const wire = (purposes: Record<string, boolean>): ConsentWire => ({
  purposes,
  timestamp: "2025-10-14T12:00:00.000Z",
});

const loadModules = () => {
  let sdkPackage!: typeof import("../sdkPackage");
  let consent!: typeof import("../../consent/consent");
  let sdkConfig!: typeof import("../../consent/sdkConfig");
  let killSwitch!: typeof import("../../consent/killSwitch");
  let attributionMode!: typeof import("../attributionMode");
  jest.isolateModules(() => {
    sdkPackage = require("../sdkPackage");
    attributionMode = require("../attributionMode");
    consent = require("../../consent/consent");
    sdkConfig = require("../../consent/sdkConfig");
    killSwitch = require("../../consent/killSwitch");
  });
  return { ...sdkPackage, ...consent, ...sdkConfig, ...killSwitch, ...attributionMode };
};

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  jest.dontMock(MARKER);
  warn.mockClear();
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

  it("is core even with the option and consent for attribution, and warns", async () => {
    const { INSTALLED_PACKAGE, configureAttribution, setConsent, sdkPackageForRequest } =
      loadModules();
    configureAttribution(provider);
    setConsent({ purposes: { attribution: true } });

    expect(INSTALLED_PACKAGE).toBe("core");
    expect(await sdkPackageForRequest()).toBe("core");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("is not installed"));
  });
});

describe("with the attribution package", () => {
  beforeEach(() => {
    jest.doMock(MARKER, () => ({}), { virtual: true });
  });

  it("is core without the option, even with consent, and warns", async () => {
    const { configureAttribution, setConsent, sdkPackageForRequest } = loadModules();
    configureAttribution(undefined);
    setConsent({ purposes: { attribution: true } });

    expect(await sdkPackageForRequest()).toBe("core");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("attribution is off"));
  });

  it("is mmp with the option once consent for attribution is passed on this launch", async () => {
    const { INSTALLED_PACKAGE, configureAttribution, setConsent, sdkPackageForRequest } =
      loadModules();
    configureAttribution(provider);
    setConsent({ purposes: { attribution: true } });

    expect(INSTALLED_PACKAGE).toBe("mmp");
    expect(await sdkPackageForRequest()).toBe("mmp");
  });

  it("is core with the SDK off, so no attribution field is read", async () => {
    const {
      configureAttribution,
      setConsent,
      setEnabled,
      sdkPackageForRequest,
      attributionMatchFieldsFor,
    } = loadModules();
    const matchProvider = fakeAttributionProvider();
    configureAttribution(matchProvider);
    setConsent({ purposes: { attribution: true } });
    setEnabled(false);

    const sdkPackage = await sdkPackageForRequest();
    expect(sdkPackage).toBe("core");
    expect(
      await attributionMatchFieldsFor(sdkPackage, { started: jest.fn(), answered: jest.fn() }),
    ).toEqual({});
    expect(matchProvider.matchFields).not.toHaveBeenCalled();
  });

  it("is core before consent, with a refusal, or with consent for other purposes only", async () => {
    const { configureAttribution, setConsent, sdkPackageForRequest } = loadModules();
    configureAttribution(provider);
    expect(await sdkPackageForRequest()).toBe("core");

    setConsent({ purposes: { attribution: false } });
    expect(await sdkPackageForRequest()).toBe("core");

    setConsent({ purposes: { analytics: true } });
    expect(await sdkPackageForRequest()).toBe("core");
  });

  it("does not trust a grant stored on an earlier launch", async () => {
    const { storage, items } = memoryStorage();
    items.set("Detour_consent", JSON.stringify(wire({ attribution: true })));
    const { configureAttribution, configureConsent, sdkPackageForRequest } = loadModules();
    configureAttribution(provider);
    configureConsent(storage, { apiKey: "key", appID: "app" }, async () => ({
      deviceId: "device",
      userId: null,
    }));

    expect(await sdkPackageForRequest()).toBe("core");
  });

  it("is core when the gate cannot be read, so the request still goes out", async () => {
    const { configureAttribution, configureKillSwitch, setConsent, sdkPackageForRequest } =
      loadModules();
    const { storage } = memoryStorage();
    storage.getItem = () => {
      throw new Error("storage unavailable");
    };
    configureKillSwitch(storage, { apiKey: "key", appID: "app" }, async () => "device");
    configureAttribution(provider);
    setConsent({ purposes: { attribution: true } });

    expect(await sdkPackageForRequest()).toBe("core");
  });

  it("is mmp without consent only when the server opens the attribution gate", async () => {
    const { applySdkConfig, configureAttribution, configureSdkConfig, sdkPackageForRequest } =
      loadModules();
    configureAttribution(provider);
    configureSdkConfig(memoryStorage().storage, "app");
    await applySdkConfig(
      { schema_version: 1, consent_gate_default: { attribution: "open" } },
      null,
    );

    expect(await sdkPackageForRequest()).toBe("mmp");
  });
});
