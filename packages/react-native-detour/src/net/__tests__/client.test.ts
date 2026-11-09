import { detourFetch } from "../client";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));

const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const respond = (status: number) => ({ status, ok: status < 400 }) as Response;

describe("detourFetch", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("retries once after a 5xx when asked to", async () => {
    fetchMock.mockResolvedValueOnce(respond(503)).mockResolvedValueOnce(respond(200));

    const response = await detourFetch("matchLink", { config, body: {}, retries: 1 });

    expect(response?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after a network error when asked to", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(respond(200));

    await detourFetch("matchLink", { config, body: {}, retries: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry by default or after a 4xx", async () => {
    fetchMock.mockResolvedValue(respond(503));
    await detourFetch("analyticsEvent", { config, body: {} });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(respond(404));
    await detourFetch("matchLink", { config, body: {}, retries: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a request that takes longer than the timeout", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    await expect(
      detourFetch("analyticsEvent", { config, body: {}, timeoutMs: 10 }),
    ).rejects.toThrow("aborted");
  });
});

describe("X-SDK-Package", () => {
  const headerSent = async (sdkPackage: "core" | "mmp") => {
    let detourFetchWith!: typeof detourFetch;
    jest.isolateModules(() => {
      jest.doMock("../sdkPackage", () => ({ sdkPackageForRequest: async () => sdkPackage }));
      detourFetchWith = require("../client").detourFetch;
    });
    const fetchMock = jest.fn(async () => respond(200));
    global.fetch = fetchMock as unknown as typeof fetch;
    await detourFetchWith("analyticsEvent", { config, body: {} });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    return (init.headers as Record<string, string>)["X-SDK-Package"];
  };

  afterEach(() => {
    jest.dontMock("../sdkPackage");
  });

  it("sends the package resolved for the request", async () => {
    expect(await headerSent("core")).toBe("core");
    expect(await headerSent("mmp")).toBe("mmp");
  });
});
