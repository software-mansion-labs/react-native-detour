import { memoryStorage } from "../../__fixtures__/memoryStorage";
import { decide } from "../consentGate";
import type { ConsentWire } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const wire = (purposes: Record<string, boolean>): ConsentWire => ({
  purposes,
  timestamp: "2025-10-14T12:00:00.000Z",
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("consent gate", () => {
  const granted = wire({ analytics: true });
  const denied = wire({ analytics: false });
  const otherPurposeOnly = wire({ attribution: true });

  const gate = (
    gateDefault: "open" | "closed",
    consentPassedThisLaunch: ConsentWire | null = null,
    storedConsent: ConsentWire | null = null,
    isEnabled = true,
  ) => decide("analytics", { isEnabled, consentPassedThisLaunch, storedConsent, gateDefault });

  it("uses the server default without consent", () => {
    expect(gate("open")).toBe("send");
    expect(gate("closed")).toBe("wait");
  });

  it("lets consent from this launch decide whatever the default", () => {
    expect(gate("closed", granted)).toBe("send");
    expect(gate("open", denied)).toBe("drop");
    expect(gate("open", otherPurposeOnly)).toBe("drop");
  });

  it("blocks on a stored refusal at cold start", () => {
    expect(gate("open", null, denied)).toBe("drop");
    expect(gate("open", null, otherPurposeOnly)).toBe("drop");
  });

  it("does not pass a closed gate on a stored grant alone", () => {
    expect(gate("closed", null, granted)).toBe("wait");
    expect(gate("open", null, granted)).toBe("send");
  });

  it("drops even granted purposes with the SDK off", () => {
    expect(gate("open", granted, null, false)).toBe("drop");
  });

  it("lets a new choice on this launch replace the stored one", () => {
    expect(gate("closed", granted, denied)).toBe("send");
  });
});

describe("setConsent", () => {
  const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }));
  const requestConfig = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
  const identity = async () => ({ deviceId: "device", userId: "u1" });

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const loadModule = () => {
    let consent!: typeof import("../consent");
    jest.isolateModules(() => {
      consent = require("../consent");
    });
    return consent;
  };

  it("sends the consent in the contract format and stores it", async () => {
    const { configureConsent, setConsent, getConsentPassedThisLaunch } = loadModule();
    const { storage, items } = memoryStorage();
    configureConsent(storage, requestConfig, identity);

    setConsent(
      {
        purposes: { analytics: true, ad_network_sharing: false },
        timestamp: new Date("2025-10-14T12:00:00.000Z"),
        consentTextRef: "cmp-v12",
        source: "cmp",
      },
      "We use your data to…",
    );
    await flush();

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      device_id: "device",
      user_id: "u1",
      consent: {
        purposes: { analytics: true, ad_network_sharing: false },
        timestamp: "2025-10-14T12:00:00.000Z",
        consent_text_ref: "cmp-v12",
        schema_version: 1,
        source: "cmp",
      },
      consent_text: "We use your data to…",
    });
    expect(getConsentPassedThisLaunch()).toEqual(body.consent);
    expect(JSON.parse(items.get("Detour_consent")!)).toEqual(body.consent);
  });

  it("applies a consent passed before DetourProvider mounted and sends it on mount", async () => {
    const { configureConsent, setConsent, getConsentPassedThisLaunch } = loadModule();
    setConsent({ purposes: { analytics: false } });
    expect(getConsentPassedThisLaunch()?.purposes).toEqual({ analytics: false });
    expect(fetchMock).not.toHaveBeenCalled();

    configureConsent(memoryStorage().storage, requestConfig, identity);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads a consent stored on an earlier launch but does not send it as a snapshot", async () => {
    const { storage, items } = memoryStorage();
    items.set("Detour_consent", JSON.stringify(wire({ analytics: false })));
    const { configureConsent, getStoredConsent, getConsentPassedThisLaunch } = loadModule();
    configureConsent(storage, requestConfig, identity);

    expect((await getStoredConsent())?.purposes).toEqual({ analytics: false });
    expect(getConsentPassedThisLaunch()).toBeNull();
  });
});

describe("setConsent on every launch", () => {
  const fetchMock = jest.fn(async (_url: string, _init: RequestInit) => ({
    ok: true,
    status: 200,
  }));
  const requestConfig = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
  const identity = async () => ({ deviceId: "device", userId: null });

  beforeEach(() => {
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Each launch loads the modules again over the same storage.
  const launch = (storage: ReturnType<typeof memoryStorage>["storage"]) => {
    let consent!: typeof import("../consent");
    jest.isolateModules(() => {
      consent = require("../consent");
    });
    consent.configureConsent(storage, requestConfig, identity);
    return consent;
  };
  const sentConsents = () =>
    fetchMock.mock.calls.map((call) => JSON.parse(call[1].body as string).consent);

  it("sends an unchanged choice once and keeps the time it was first passed", async () => {
    const { storage } = memoryStorage();
    launch(storage).setConsent({ purposes: { analytics: true } }, "We use your data to…");
    await flush();
    const first = sentConsents()[0];

    const nextLaunch = launch(storage);
    nextLaunch.setConsent({ purposes: { analytics: true } }, "We use your data to…");
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(nextLaunch.getConsentPassedThisLaunch()).toEqual(first);
  });

  it("sends a changed choice or one with its own timestamp", async () => {
    const { storage } = memoryStorage();
    launch(storage).setConsent({ purposes: { analytics: true } });
    await flush();

    launch(storage).setConsent({ purposes: { analytics: false } });
    await flush();
    launch(storage).setConsent({
      purposes: { analytics: false },
      timestamp: new Date("2025-10-14T12:00:00.000Z"),
    });
    await flush();

    expect(sentConsents().map((consent) => consent.purposes)).toEqual([
      { analytics: true },
      { analytics: false },
      { analytics: false },
    ]);
  });

  it("sends an unchanged choice again until the server confirms it", async () => {
    const { storage } = memoryStorage();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    launch(storage).setConsent({ purposes: { analytics: true } });
    await flush();

    launch(storage).setConsent({ purposes: { analytics: true } });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentConsents()[1]).toEqual(sentConsents()[0]);
  });

  it("sends an unchanged choice again for a new device ID, as after a restored backup", async () => {
    const { storage } = memoryStorage();
    launch(storage).setConsent({ purposes: { analytics: true } });
    await flush();

    let consent!: typeof import("../consent");
    jest.isolateModules(() => {
      consent = require("../consent");
    });
    consent.configureConsent(storage, requestConfig, async () => ({
      deviceId: "new",
      userId: null,
    }));
    consent.setConsent({ purposes: { analytics: true } });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string).device_id).toBe("new");
  });

  it("drops a consent the API would reject and leaves the previous one", async () => {
    const consent = launch(memoryStorage().storage);
    consent.setConsent({ purposes: { analytics: true } });

    consent.setConsent({ purposes: { analytics: "true" as unknown as boolean } });
    consent.setConsent({ purposes: { analytics: false }, timestamp: new Date("not a date") });
    consent.setConsent({ purposes: { analytics: false }, schemaVersion: 1.5 });
    await flush();

    expect(consent.getConsentPassedThisLaunch()?.purposes).toEqual({ analytics: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "🔗[Detour:CONSENT] setConsent dropped: timestamp must be a valid Date.",
    );
  });

  it("sends an empty consent text as no text", async () => {
    launch(memoryStorage().storage).setConsent({ purposes: { analytics: true } }, "");
    await flush();

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).not.toHaveProperty(
      "consent_text",
    );
  });
});
