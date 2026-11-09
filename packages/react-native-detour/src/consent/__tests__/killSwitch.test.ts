import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const loadModule = () => {
  let killSwitch!: typeof import("../killSwitch");
  jest.isolateModules(() => {
    killSwitch = require("../killSwitch");
  });
  return killSwitch;
};

const requestConfig = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const deviceId = async () => "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01";
const respond = (status: number) => ({ ok: status < 400, status }) as Response;
// setEnabled writes the state and starts reporting in the background.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
const sentBodies = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.map((call) => JSON.parse((call[1] as RequestInit).body as string));

describe("kill switch", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps the disabled state across launches and reports it once", async () => {
    fetchMock.mockResolvedValue(respond(200));
    const { storage } = memoryStorage();
    const first = loadModule();
    first.configureKillSwitch(storage, requestConfig, deviceId);
    first.setEnabled(false);
    await settle();

    expect(await first.isSdkEnabled()).toBe(false);
    expect(sentBodies(fetchMock)).toEqual([
      expect.objectContaining({ device_id: await deviceId(), disabled: true }),
    ]);

    const relaunched = loadModule();
    relaunched.configureKillSwitch(storage, requestConfig, deviceId);
    relaunched.setEnabled(false);
    await settle();
    expect(await relaunched.isSdkEnabled()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps reporting after a storage read failed", async () => {
    fetchMock.mockResolvedValue(respond(200));
    const { storage } = memoryStorage();
    const getItem = storage.getItem;
    let failedOnce = false;
    storage.getItem = (key) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("storage unavailable");
      }
      return getItem(key);
    };
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const killSwitch = loadModule();
    killSwitch.configureKillSwitch(storage, requestConfig, deviceId);
    await settle();

    killSwitch.setEnabled(false);
    await settle();

    expect(sentBodies(fetchMock)).toEqual([expect.objectContaining({ disabled: true })]);
  });

  it("retries until the server confirms", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(respond(503)).mockResolvedValueOnce(respond(200));
    const killSwitch = loadModule();
    killSwitch.configureKillSwitch(memoryStorage().storage, requestConfig, deviceId);
    killSwitch.setEnabled(false);

    await jest.advanceTimersByTimeAsync(killSwitch.FIRST_RETRY_DELAY_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends a change made during a request after it", async () => {
    const killSwitch = loadModule();
    fetchMock.mockImplementationOnce(async () => {
      killSwitch.setEnabled(true);
      return respond(200);
    });
    fetchMock.mockResolvedValue(respond(200));
    killSwitch.configureKillSwitch(memoryStorage().storage, requestConfig, deviceId);
    killSwitch.setEnabled(false);
    await settle();

    expect(sentBodies(fetchMock).map((body) => body.disabled)).toEqual([true, false]);
  });

  it("keeps a rejected state for the next launch", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(respond(400));
    const { storage, items } = memoryStorage();
    const killSwitch = loadModule();
    killSwitch.configureKillSwitch(storage, requestConfig, deviceId);
    killSwitch.setEnabled(false);
    await settle();

    expect(items.get("Detour_enabled")).toBe("false");
    expect(items.get("Detour_reportedEnabled")).toBe("true");
  });

  it("forgets the state with a storage restored from another install", async () => {
    const { storage, items } = memoryStorage();
    items.set("Detour_enabled", "false");
    const killSwitch = loadModule();
    await killSwitch.resetKillSwitch(storage);
    killSwitch.configureKillSwitch(storage, requestConfig, deviceId);

    expect(await killSwitch.isSdkEnabled()).toBe(true);
  });
});
