import { fakeAttributionProvider } from "../../__fixtures__/attributionProvider";
import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { DetourAdvertisingId } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../identity/deviceId", () => ({ getDeviceId: async () => "device" }));
jest.mock("../../net/requestContext", () => ({ getRequestContext: async () => ({}) }));
jest.mock("../../start", () => ({
  isStarted: () => true,
  whenStarted: () => new Promise(() => {}),
}));
jest.mock("../sdkPackage", () => ({ sdkPackageForRequest: async () => "mmp" }));

const idfa = { id: "6d92078a-8246-4ba4-ae5b-76104861e7dc", type: "idfa" as const };
const advertisingId = jest.fn<Promise<DetourAdvertisingId | null>, []>();
const vendorId = jest.fn<Promise<string | null>, []>();
const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const fetchMock = jest.fn();

type Modules = typeof import("../deviceIdentifiers") &
  typeof import("../attributionMode") &
  typeof import("../firstMatch") &
  typeof import("../../consent/consent") &
  typeof import("../../consent/sdkConfig");

/** Fresh modules with a provider that reads the mocks; no consent passed waits. */
const load = (
  { adNetworkSharing }: { adNetworkSharing?: boolean } = { adNetworkSharing: true },
) => {
  let modules!: Modules;
  jest.isolateModules(() => {
    modules = {
      ...require("../deviceIdentifiers"),
      ...require("../attributionMode"),
      ...require("../firstMatch"),
      ...require("../../consent/consent"),
      ...require("../../consent/sdkConfig"),
    };
  });
  modules.setAttributionProvider({ ...fakeAttributionProvider(), advertisingId, vendorId });
  if (adNetworkSharing !== undefined) {
    modules.setConsent({ purposes: { attribution: true, ad_network_sharing: adNetworkSharing } });
  }
  return modules;
};

const sentBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

beforeEach(() => {
  advertisingId.mockReset();
  advertisingId.mockResolvedValue(idfa);
  vendorId.mockReset();
  vendorId.mockResolvedValue("idfv-1");
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("identifierChanges", () => {
  it("sends a changed ID, clears one known to be gone and keeps one not read now", () => {
    const { identifierChanges } = load();
    const first = identifierChanges({ advertising_id: idfa }, {});
    expect(first.fields).toEqual({ advertising_id: idfa });

    expect(identifierChanges({ advertising_id: idfa }, first.hashes).fields).toEqual({});
    expect(identifierChanges({ advertising_id: undefined }, first.hashes)).toEqual({
      fields: {},
      hashes: first.hashes,
    });
    expect(identifierChanges({ advertising_id: null }, first.hashes)).toEqual({
      fields: { advertising_id: null },
      hashes: {},
    });
  });
});

describe("identifiersForMatch", () => {
  it("reads the advertising ID only with consent to sharing with ad networks", async () => {
    const modules = load({ adNetworkSharing: false });
    expect(await modules.identifiersForMatch("mmp")).toEqual({});

    modules.setConsent({ purposes: { attribution: true, ad_network_sharing: true } });
    expect(await modules.identifiersForMatch("mmp")).toEqual({ advertising_id: idfa });
  });

  it("reads the IDFV only when the server turns it on", async () => {
    const modules = load({ adNetworkSharing: false });
    modules.configureSdkConfig(memoryStorage().storage, "app");
    await modules.applySdkConfig({ schema_version: 1, consent_gate_default: {} }, null);
    expect(await modules.identifiersForMatch("mmp")).toEqual({});

    await modules.applySdkConfig(
      { schema_version: 1, consent_gate_default: {}, feature_flags: { read_idfv: true } },
      null,
    );
    expect(await modules.identifiersForMatch("mmp")).toEqual({ idfv: "idfv-1" });
  });

  it("keeps the other IDs when one read fails", async () => {
    advertisingId.mockRejectedValue(new Error("Play services unavailable"));
    const modules = load();
    modules.configureSdkConfig(memoryStorage().storage, "app");
    await modules.applySdkConfig(
      { schema_version: 1, consent_gate_default: {}, feature_flags: { read_idfv: true } },
      null,
    );

    expect(await modules.identifiersForMatch("mmp")).toEqual({ idfv: "idfv-1" });
  });

  it("reads nothing for a core request", async () => {
    const { identifiersForMatch } = load();

    expect(await identifiersForMatch("core")).toEqual({});
    expect(advertisingId).not.toHaveBeenCalled();
  });

  it("goes without an ID read slower than the limit", async () => {
    jest.useFakeTimers();
    advertisingId.mockReturnValue(new Promise(() => {}));
    const { identifiersForMatch, ATTRIBUTION_FIELDS_TIMEOUT_MS } = load();

    const identifiers = identifiersForMatch("mmp");
    await jest.advanceTimersByTimeAsync(ATTRIBUTION_FIELDS_TIMEOUT_MS);

    expect(await identifiers).toEqual({});
  });
});

describe("syncDeviceIdentifiers", () => {
  // Marks the first match as done, so the reporter may send.
  const afterFirstMatch = () => memoryStorage({ Detour_firstEntranceFlag: "true" });

  it("does not send the same state again once the server answered", async () => {
    const { storage } = afterFirstMatch();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { configureDeviceIdentifiers, syncDeviceIdentifiers } = load();
    configureDeviceIdentifiers(storage, config);

    await syncDeviceIdentifiers();
    await syncDeviceIdentifiers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/api/sdk/device-identifiers");
    expect(sentBodies()).toEqual([{ advertising_id: idfa, device_id: "device" }]);
  });

  it("does not send again what the first match already carried, and clears an opt-out", async () => {
    const { storage } = afterFirstMatch();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { configureDeviceIdentifiers, markSentWithMatch, syncDeviceIdentifiers } = load();
    configureDeviceIdentifiers(storage, config);

    await markSentWithMatch("device", { advertising_id: idfa });
    await syncDeviceIdentifiers();
    expect(fetchMock).not.toHaveBeenCalled();

    advertisingId.mockResolvedValue(null);
    await syncDeviceIdentifiers();
    expect(sentBodies()).toEqual([{ advertising_id: null, device_id: "device" }]);
  });

  it("keeps the ID on the server while it cannot be read, and clears it after a refusal", async () => {
    const { storage } = afterFirstMatch();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    advertisingId.mockRejectedValue(new Error("Play services unavailable"));
    const modules = load({ adNetworkSharing: undefined });
    modules.configureDeviceIdentifiers(storage, config);
    await modules.markSentWithMatch("device", { advertising_id: idfa });

    await modules.syncDeviceIdentifiers();
    modules.setConsent({ purposes: { attribution: true, ad_network_sharing: true } });
    await modules.syncDeviceIdentifiers();
    expect(fetchMock).not.toHaveBeenCalled();

    modules.setConsent({ purposes: { attribution: true, ad_network_sharing: false } });
    await modules.syncDeviceIdentifiers();
    expect(sentBodies()).toEqual([{ advertising_id: null, device_id: "device" }]);
  });

  it("tries again after a 5xx", async () => {
    const { storage } = afterFirstMatch();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { configureDeviceIdentifiers, syncDeviceIdentifiers } = load();
    configureDeviceIdentifiers(storage, config);

    await syncDeviceIdentifiers();
    await syncDeviceIdentifiers();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits while the first match runs and sends once it ended", async () => {
    const { storage } = afterFirstMatch();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const modules = load();
    modules.configureDeviceIdentifiers(storage, config);

    let sentDuringMatch = -1;
    await modules.duringFirstMatch(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      sentDuringMatch = fetchMock.mock.calls.length;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sentDuringMatch).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing on the first launch before the match", async () => {
    const { storage } = memoryStorage();
    const { configureDeviceIdentifiers, syncDeviceIdentifiers } = load();
    configureDeviceIdentifiers(storage, config);

    await syncDeviceIdentifiers();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
