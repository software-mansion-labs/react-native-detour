import { Linking } from "react-native";

import { renderHook, waitFor } from "@testing-library/react-native";

import { fakeAttributionProvider } from "../../../__fixtures__/attributionProvider";
import { memoryStorage } from "../../../__fixtures__/memoryStorage";
import { setAttributionProvider } from "../../../attribution/attributionMode";
import { setConsent } from "../../../consent/consent";
import { start } from "../../../start";
import { getDeferredLink } from "../../api/getDeferredLink";
import { StorageKeys } from "../../utils/storage";
import { useDetour } from "../useDetour";

jest.mock("../../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../api/getDeferredLink", () => ({ getDeferredLink: jest.fn(async () => null) }));
jest.mock("../../../identity/deviceId", () => ({
  getDeviceId: async () => "device",
  reconcileInstall: async () => {},
}));
jest.mock("../../../identity/userId", () => ({ getUserId: async () => null }));
jest.mock("../../api/sendUniversalLinkClick", () => ({ sendUniversalLinkClick: jest.fn() }));
jest.mock("../../api/resolveShortLink", () => ({ resolveShortLink: jest.fn() }));

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

describe("useDetour with attribution on", () => {
  it("is ready for the UI at once, then matches once the attribution gate decides", async () => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
    const { storage, items } = memoryStorage();
    setAttributionProvider(fakeAttributionProvider());
    start();
    jest.mocked(getDeferredLink).mockResolvedValueOnce("https://app.godetour.link/product/1");

    const { result } = await renderHook(() =>
      useDetour({
        apiKey: "key",
        appID: "app",
        shouldUseClipboard: false,
        storage,
        linkProcessingMode: "all",
      }),
    );

    // An app that waits for this before its consent prompt must not hang.
    await waitFor(() => expect(result.current.isReadyForUI).toBe(true));
    expect(result.current.isInitialLinkResolved).toBe(false);
    expect(getDeferredLink).not.toHaveBeenCalled();
    expect(items.has(StorageKeys.FIRST_ENTRANCE_FLAG_KEY)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("waits for consent to attribution"));

    setConsent({ purposes: { attribution: true } });

    await waitFor(() => expect(getDeferredLink).toHaveBeenCalledTimes(1));
    expect(items.get(StorageKeys.FIRST_ENTRANCE_FLAG_KEY)).toBe("true");
    await waitFor(() => expect(result.current.isInitialLinkResolved).toBe(true));
    expect(result.current.link).not.toBeNull();
  });
});

// Each launch loads the hook again, so the session state of the previous test is gone. React and
// React Native stay shared with the renderer.
const react = jest.requireActual("react");
const reactNative = jest.requireActual("react-native");
const launch = () => {
  let modules!: {
    useDetour: typeof import("../useDetour").useDetour;
    getDeferredLink: jest.Mock;
    setAttributionProvider: typeof import("../../../attribution/attributionMode").setAttributionProvider;
    setConsent: typeof import("../../../consent/consent").setConsent;
  };
  jest.isolateModules(() => {
    jest.doMock("react", () => react);
    jest.doMock("react-native", () => reactNative);
    modules = {
      useDetour: require("../useDetour").useDetour,
      getDeferredLink: require("../../api/getDeferredLink").getDeferredLink,
      setAttributionProvider: require("../../../attribution/attributionMode")
        .setAttributionProvider,
      setConsent: require("../../../consent/consent").setConsent,
    };
    require("../../../start").start();
  });
  return modules;
};

describe("useDetour flags", () => {
  const config = {
    apiKey: "key",
    appID: "app",
    shouldUseClipboard: false,
    linkProcessingMode: "all" as const,
  };

  beforeEach(() => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  });

  it("resolves the initial link as null when nothing matched", async () => {
    const { useDetour: useFreshDetour } = launch();
    const { storage } = memoryStorage();

    const { result } = await renderHook(() => useFreshDetour({ ...config, storage }));

    await waitFor(() => expect(result.current.isInitialLinkResolved).toBe(true));
    expect(result.current.isReadyForUI).toBe(true);
    expect(result.current.link).toBeNull();
  });

  it("turns both flags true in one render when nothing waits", async () => {
    const { useDetour: useFreshDetour } = launch();
    const { storage } = memoryStorage({ [StorageKeys.FIRST_ENTRANCE_FLAG_KEY]: "true" });
    const renders: [boolean, boolean][] = [];

    const { result } = await renderHook(() => {
      const value = useFreshDetour({ ...config, storage });
      renders.push([value.isReadyForUI, value.isInitialLinkResolved]);
      return value;
    });

    await waitFor(() => expect(result.current.isInitialLinkResolved).toBe(true));
    expect(renders).not.toContainEqual([true, false]);
  });

  it("keeps the link unresolved when the effect runs again while the match waits", async () => {
    const fresh = launch();
    fresh.setAttributionProvider(fakeAttributionProvider());
    const { storage } = memoryStorage();

    const { result, rerender } = await renderHook(
      ({ shouldUseClipboard }: { shouldUseClipboard: boolean }) =>
        fresh.useDetour({ ...config, storage, shouldUseClipboard }),
      { initialProps: { shouldUseClipboard: false } },
    );
    await waitFor(() => expect(result.current.isReadyForUI).toBe(true));
    await rerender({ shouldUseClipboard: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.isInitialLinkResolved).toBe(false);

    fresh.setConsent({ purposes: { attribution: false } });
    await waitFor(() => expect(result.current.isInitialLinkResolved).toBe(true));
  });
});
