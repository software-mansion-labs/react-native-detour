import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../identity/deviceId", () => ({ getDeviceId: async () => "device" }));
jest.mock("../../net/requestContext", () => ({ getRequestContext: async () => ({}) }));
jest.mock("../../start", () => ({
  isStarted: () => true,
  whenStarted: () => new Promise(() => {}),
}));

const idfa = { id: "6d92078a-8246-4ba4-ae5b-76104861e7dc", type: "idfa" as const };
const mockIdentifiers = { value: { advertising_id: idfa } as Record<string, unknown> };
jest.mock("../attributionMode", () => ({
  deviceIdentifiersFor: async () => mockIdentifiers.value,
}));
jest.mock("../sdkPackage", () => ({ sdkPackageForRequest: async () => "mmp" }));

const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const fetchMock = jest.fn();

const load = () => {
  let module!: typeof import("../deviceIdentifiers");
  jest.isolateModules(() => {
    module = require("../deviceIdentifiers");
  });
  return module;
};

beforeEach(() => {
  mockIdentifiers.value = { advertising_id: idfa };
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("identifierChanges", () => {
  it("sends only changed fields and clears a gone one", () => {
    const { identifierChanges } = load();
    const first = identifierChanges({ advertising_id: idfa }, {});
    expect(first.fields).toEqual({ advertising_id: idfa });

    expect(identifierChanges({ advertising_id: idfa }, first.hashes).fields).toEqual({});

    const withdrawn = identifierChanges({}, first.hashes);
    expect(withdrawn.fields).toEqual({ advertising_id: null });
    expect(withdrawn.hashes).toEqual({});
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
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/sdk/device-identifiers");
    expect(JSON.parse(init.body)).toEqual({ advertising_id: idfa, device_id: "device" });
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
    let module!: typeof import("../deviceIdentifiers");
    let firstMatch!: typeof import("../firstMatch");
    jest.isolateModules(() => {
      module = require("../deviceIdentifiers");
      firstMatch = require("../firstMatch");
    });
    module.configureDeviceIdentifiers(storage, config);

    let sentDuringMatch = -1;
    await firstMatch.duringFirstMatch(async () => {
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
