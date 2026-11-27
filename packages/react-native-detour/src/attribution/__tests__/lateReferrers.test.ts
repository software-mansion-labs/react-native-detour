import { memoryStorage } from "../../__fixtures__/memoryStorage";
import type { ReferrerRead } from "../referrerRead";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../identity/deviceId", () => ({ getDeviceId: async () => "device" }));

const mockAppState = {
  currentState: "background",
  onChange: [] as ((state: string) => void)[],
};
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  AppState: {
    get currentState() {
      return mockAppState.currentState;
    },
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mockAppState.onChange.push(listener);
      return { remove: () => {} };
    },
  },
}));

const mockDecision = { value: "send" as "send" | "wait" | "drop" };
const mockProvider = { isSet: true };
const mockGate = { decided: Promise.resolve() };
const mockReads = {
  meta: jest.fn((): Promise<ReferrerRead<unknown>> | null => null),
  play: jest.fn(async (): Promise<ReferrerRead<unknown>> => "none"),
};
jest.mock("../attributionMode", () => ({
  attributionDecision: async () => mockDecision.value,
  whenAttributionDecided: () => mockGate.decided,
  hasAttributionProvider: () => mockProvider.isSet,
  readMetaInstallReferrerAgain: () => mockReads.meta(),
}));
jest.mock("../../links/utils/installReferrer", () => ({
  readInstallReferrer: () => mockReads.play(),
}));

const referrer = {
  install_referrer: "encrypted",
  is_ct: true,
  actual_timestamp: 1_700_000_000,
  source_app: "facebook" as const,
};
const playReferrer = { raw: "utm_source=google&gclid=Cj0", gclid: "Cj0" };
const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const fetchMock = jest.fn();
const DAY_MS = 24 * 60 * 60 * 1000;

const KEPT_META = "Detour_lateMetaReferrer";
const KEPT_PLAY = "Detour_latePlayReferrer";
const UNREAD_META = "Detour_unreadMetaReferrer";
const UNREAD_PLAY = "Detour_unreadPlayReferrer";

// The kept referrer is read, checked and sent over a few async steps.
const settle = async () => {
  for (let step = 0; step < 10; step++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const load = () => {
  let module!: typeof import("../lateReferrers");
  jest.isolateModules(() => {
    module = require("../lateReferrers");
  });
  return module;
};

const launch = async (storage: ReturnType<typeof memoryStorage>["storage"]) => {
  const module = load();
  module.configureLateReferrers(storage, config);
  await settle();
  return module;
};

const sentTo = () => fetchMock.mock.calls.map(([url]) => url);
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);
const unread = (sinceMs: number) => JSON.stringify({ since: sinceMs });

const matchEnded = Promise.resolve();

beforeEach(() => {
  mockAppState.currentState = "background";
  mockAppState.onChange = [];
  mockDecision.value = "send";
  mockGate.decided = Promise.resolve();
  mockProvider.isSet = true;
  mockReads.meta.mockReset().mockReturnValue(null);
  mockReads.play.mockReset().mockResolvedValue("none");
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("sendLateReferrer", () => {
  it("sends the referrer once and forgets it after the server takes it", async () => {
    const { storage, items } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await (await launch(storage)).sendLateReferrer("meta", "device", referrer, matchEnded);
    await launch(storage);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentTo()).toEqual(["https://api.example.com/api/sdk/meta-install-referrer"]);
    expect(sentBody(0)).toEqual({ device_id: "device", meta_install_referrer: referrer });
    expect(items.has(KEPT_META)).toBe(false);
  });

  it("sends a Google Play referrer to its own address", async () => {
    const { storage, items } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await (await launch(storage)).sendLateReferrer("play", "device", playReferrer, matchEnded);

    expect(sentTo()).toEqual(["https://api.example.com/api/sdk/install-referrer"]);
    expect(sentBody(0)).toEqual({ device_id: "device", install_referrer: playReferrer });
    expect(items.has(KEPT_PLAY)).toBe(false);
  });

  it("keeps it for the next launch while the install is not saved", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await (await launch(storage)).sendLateReferrer("meta", "device", referrer, matchEnded);

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    await launch(storage);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops it after a refusal and on a request the server rejects", async () => {
    const refused = memoryStorage();
    mockDecision.value = "drop";
    await (await launch(refused.storage)).sendLateReferrer("meta", "device", referrer, matchEnded);
    expect(refused.items.has(KEPT_META)).toBe(false);

    const rejected = memoryStorage();
    mockDecision.value = "send";
    jest.spyOn(console, "warn").mockImplementationOnce(() => {});
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await (await launch(rejected.storage)).sendLateReferrer("meta", "device", referrer, matchEnded);
    expect(rejected.items.has(KEPT_META)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send a referrer of another device ID", async () => {
    const { storage, items } = memoryStorage();
    await (await launch(storage)).sendLateReferrer("meta", "restored-device", referrer, matchEnded);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(items.has(KEPT_META)).toBe(false);
  });

  it("sends a kept referrer once the gate decides after the mount", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await (await launch(storage)).sendLateReferrer("meta", "device", referrer, matchEnded);
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
    const sent = (await launch(memoryStorage().storage)).sendLateReferrer(
      "meta",
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

  it("keeps the read-again note when the referrer could not be stored", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { storage, items } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const meta = (await launch(storage)).lateMetaReadHooks("device", matchEnded);
    await meta.started();
    jest.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("disk full");
    });

    await meta.answeredLate({ found: referrer });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(items.has(UNREAD_META)).toBe(true);
  });

  it("drops a kept value it cannot read", async () => {
    const { storage, items } = memoryStorage({ [KEPT_META]: "{not json" });
    await launch(storage);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(items.has(KEPT_META)).toBe(false);
  });
});

describe("a first read that never answered", () => {
  it("is read again on the next launch and sent", async () => {
    const { storage, items } = memoryStorage({
      [UNREAD_META]: unread(Date.now() - DAY_MS),
      [UNREAD_PLAY]: unread(Date.now() - DAY_MS),
    });
    mockReads.meta.mockReturnValue(Promise.resolve({ found: referrer }));
    mockReads.play.mockResolvedValue({ found: { installReferrer: playReferrer } });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await launch(storage);

    expect(sentTo()).toEqual([
      "https://api.example.com/api/sdk/install-referrer",
      "https://api.example.com/api/sdk/meta-install-referrer",
    ]);
    expect(sentBody(0)).toEqual({ device_id: "device", install_referrer: playReferrer });
    expect(sentBody(1)).toEqual({ device_id: "device", meta_install_referrer: referrer });
    expect([...items.keys()]).toEqual([]);
  });

  it("is forgotten when the read finds none, and stays noted when it fails again", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { storage, items } = memoryStorage({
      [UNREAD_META]: unread(Date.now()),
      [UNREAD_PLAY]: unread(Date.now()),
    });
    mockReads.meta.mockReturnValue(Promise.resolve("failed"));
    mockReads.play.mockResolvedValue("none");

    await launch(storage);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(items.has(UNREAD_PLAY)).toBe(false);
    expect(items.has(UNREAD_META)).toBe(true);
  });

  it("is dropped unread after 7 days or a refusal, and waits for the consent choice", async () => {
    const old = memoryStorage({ [UNREAD_META]: unread(Date.now() - 8 * DAY_MS) });
    await launch(old.storage);
    expect(old.items.has(UNREAD_META)).toBe(false);

    mockDecision.value = "wait";
    const waiting = memoryStorage({ [UNREAD_META]: unread(Date.now()) });
    await launch(waiting.storage);
    expect(waiting.items.has(UNREAD_META)).toBe(true);

    mockDecision.value = "drop";
    await launch(waiting.storage);
    expect(waiting.items.has(UNREAD_META)).toBe(false);
    expect(mockReads.meta).not.toHaveBeenCalled();
  });

  it("is not read twice while the first read still runs on this launch", async () => {
    const { storage, items } = memoryStorage();
    const meta = (await launch(storage)).lateMetaReadHooks("device", matchEnded);

    await meta.started();
    expect(items.has(UNREAD_META)).toBe(true);
    mockReads.meta.mockReturnValue(Promise.resolve({ found: referrer }));
    mockAppState.onChange[0]!("active");
    await settle();
    expect(mockReads.meta).not.toHaveBeenCalled();

    await meta.answered("none");
    expect(items.has(UNREAD_META)).toBe(false);
  });
});

describe("trackFirstRead", () => {
  it("keeps a failed Play read noted and forgets one that answered", async () => {
    const failed = memoryStorage();
    const module = await launch(failed.storage);
    expect(await module.trackFirstRead("play", async () => "failed")).toBe("failed");
    await settle();
    expect(failed.items.has(UNREAD_PLAY)).toBe(true);

    const answered = memoryStorage();
    await (await launch(answered.storage)).trackFirstRead("play", async () => "none");
    await settle();
    expect(answered.items.has(UNREAD_PLAY)).toBe(false);
  });

  it("notes nothing without the attribution package", async () => {
    mockProvider.isSet = false;
    const { storage } = memoryStorage();
    const setItem = jest.spyOn(storage, "setItem");

    await (await launch(storage)).trackFirstRead("play", async () => "failed");

    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("lateMetaReadHooks", () => {
  it("sends a referrer read after the limit on its own, and settles the others", async () => {
    const { storage, items } = memoryStorage();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const meta = (await launch(storage)).lateMetaReadHooks("device", matchEnded);

    await meta.started();
    await meta.answeredLate({ found: referrer });
    expect(sentTo()).toEqual(["https://api.example.com/api/sdk/meta-install-referrer"]);
    expect(items.has(UNREAD_META)).toBe(false);

    await meta.started();
    await meta.answeredLate("failed");
    expect(items.has(UNREAD_META)).toBe(true);
    await meta.answered({ found: referrer });
    expect(items.has(UNREAD_META)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("retries while the app is on the screen", () => {
  const failingLaunch = async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.useFakeTimers();
    mockAppState.currentState = "active";
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const { storage } = memoryStorage({
      [KEPT_META]: JSON.stringify({
        body: { device_id: "device", meta_install_referrer: referrer },
        keptAt: Date.now(),
      }),
    });
    const module = load();
    module.configureLateReferrers(storage, config);
    await jest.advanceTimersByTimeAsync(0);
    return { module, storage };
  };

  it("come with a growing gap, six times per visit", async () => {
    await failingLaunch();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(4_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("stop in the background and start again on the next visit", async () => {
    await failingLaunch();
    mockAppState.currentState = "background";
    mockAppState.onChange[0]!("background");
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    mockAppState.currentState = "active";
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    mockAppState.onChange[0]!("active");
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stop once the server took it, and a remount adds no second listener", async () => {
    const { module, storage } = await failingLaunch();
    module.configureLateReferrers(storage, config);
    expect(mockAppState.onChange).toHaveLength(1);

    fetchMock.mockClear().mockResolvedValue({ ok: true, status: 200 });
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
