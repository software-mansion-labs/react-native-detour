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
  it("reports links processed, then matches once the attribution gate decides", async () => {
    jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
    const { storage, items } = memoryStorage();
    setAttributionProvider(fakeAttributionProvider());
    start();

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
    await waitFor(() => expect(result.current.isLinkProcessed).toBe(true));
    expect(getDeferredLink).not.toHaveBeenCalled();
    expect(items.has(StorageKeys.FIRST_ENTRANCE_FLAG_KEY)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("waits for consent to attribution"));

    setConsent({ purposes: { attribution: true } });

    await waitFor(() => expect(getDeferredLink).toHaveBeenCalledTimes(1));
    expect(items.get(StorageKeys.FIRST_ENTRANCE_FLAG_KEY)).toBe("true");
  });
});
