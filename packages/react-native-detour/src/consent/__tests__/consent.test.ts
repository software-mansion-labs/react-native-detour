import type { DetourStorage } from "../../links/types";
import { decide } from "../consentGate";
import type { ConsentWire } from "../types";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const wire = (purposes: Record<string, boolean>): ConsentWire => ({
  purposes,
  timestamp: "2025-10-14T12:00:00.000Z",
});

const memoryStorage = () => {
  const items = new Map<string, string>();
  const storage: DetourStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("consent gate", () => {
  const granted = wire({ analytics: true });
  const denied = wire({ analytics: false });
  const otherPurposeOnly = wire({ attribution: true });

  const gate = (
    gateDefault: "open" | "closed",
    consentPassedThisLaunch: ConsentWire | null = null,
    storedConsent: ConsentWire | null = null,
  ) => decide("analytics", { consentPassedThisLaunch, storedConsent, gateDefault });

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
