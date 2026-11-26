import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../identity/deviceId", () => ({ getDeviceId: async () => "device" }));

const mockAppState = { onChange: [] as ((state: string) => void)[] };
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mockAppState.onChange.push(listener);
      return { remove: () => {} };
    },
  },
}));

const mockDecision = { value: "send" as "send" | "wait" | "drop" };
const mockGate = { decided: Promise.resolve() };
jest.mock("../attributionMode", () => ({
  attributionDecision: async () => mockDecision.value,
  whenAttributionDecided: () => mockGate.decided,
}));

const referrer = {
  install_referrer: "encrypted",
  is_ct: true,
  actual_timestamp: 1_700_000_000,
  source_app: "facebook" as const,
};
const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const fetchMock = jest.fn();

// The kept referrer is read, checked and sent over a few async steps.
const settle = async () => {
  for (let step = 0; step < 5; step++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const launch = async (storage: ReturnType<typeof memoryStorage>["storage"]) => {
  let module!: typeof import("../lateMetaReferrer");
  jest.isolateModules(() => {
    module = require("../lateMetaReferrer");
  });
  module.configureLateMetaReferrer(storage, config);
  await settle();
  return module;
};

const matchEnded = Promise.resolve();

beforeEach(() => {
  mockAppState.onChange = [];
  mockDecision.value = "send";
  mockGate.decided = Promise.resolve();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("sendLateMetaReferrer", () => {
  it("sends the referrer once and forgets it after the server takes it", async () => {
    const { storage, items } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await (await launch(storage)).sendLateMetaReferrer("device", referrer, matchEnded);
    await launch(storage);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/sdk/meta-install-referrer");
    expect(JSON.parse(init.body)).toEqual({ device_id: "device", meta_install_referrer: referrer });
    expect(items.has("Detour_lateMetaReferrer")).toBe(false);
  });

  it("keeps it for the next launch while the install is not saved", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await (await launch(storage)).sendLateMetaReferrer("device", referrer, matchEnded);

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    await launch(storage);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops it after a refusal and on a request the server rejects", async () => {
    const refused = memoryStorage();
    mockDecision.value = "drop";
    await (await launch(refused.storage)).sendLateMetaReferrer("device", referrer, matchEnded);
    expect(refused.items.has("Detour_lateMetaReferrer")).toBe(false);

    const rejected = memoryStorage();
    mockDecision.value = "send";
    jest.spyOn(console, "warn").mockImplementationOnce(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await (await launch(rejected.storage)).sendLateMetaReferrer("device", referrer, matchEnded);
    expect(rejected.items.has("Detour_lateMetaReferrer")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send a referrer of another device ID", async () => {
    const { storage, items } = memoryStorage();
    await (await launch(storage)).sendLateMetaReferrer("restored-device", referrer, matchEnded);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(items.has("Detour_lateMetaReferrer")).toBe(false);
  });

  it("sends a kept referrer once the gate decides after the mount", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await (await launch(storage)).sendLateMetaReferrer("device", referrer, matchEnded);
    fetchMock.mockClear().mockResolvedValue({ ok: true, status: 200 });

    let decide!: () => void;
    mockGate.decided = new Promise((resolve) => (decide = resolve));
    mockDecision.value = "wait";
    await launch(storage);
    expect(fetchMock).not.toHaveBeenCalled();

    mockDecision.value = "send";
    decide();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the deferred link request to end before sending", async () => {
    let endMatch!: () => void;
    const ended = new Promise<void>((resolve) => (endMatch = resolve));
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const sent = (await launch(memoryStorage().storage)).sendLateMetaReferrer(
      "device",
      referrer,
      ended,
    );
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();

    endMatch();
    await sent;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a kept referrer when the app comes back to the screen, once", async () => {
    const { storage } = memoryStorage();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("Unable to resolve host"));
    const module = await launch(storage);
    await module.sendLateMetaReferrer("device", referrer, matchEnded);
    module.configureLateMetaReferrer(storage, config);
    await settle();
    expect(mockAppState.onChange).toHaveLength(1);
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 });

    const [comeBack] = mockAppState.onChange as [(state: string) => void];
    comeBack("background");
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();

    comeBack("active");
    await settle();
    comeBack("active");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("drops a kept value it cannot read", async () => {
    const { storage, items } = memoryStorage({ Detour_lateMetaReferrer: "{not json" });
    await launch(storage);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(items.has("Detour_lateMetaReferrer")).toBe(false);
  });
});
