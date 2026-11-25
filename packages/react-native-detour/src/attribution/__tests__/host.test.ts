import { memoryStorage } from "../../__fixtures__/memoryStorage";

jest.mock("../../version", () => ({ SDK_HEADER_VALUE: "react-native/0.0.0" }));
jest.mock("../../identity/deviceId", () => ({ getDeviceId: async () => "device" }));

const loadModules = () => {
  let host!: typeof import("../host");
  let killSwitch!: typeof import("../../consent/killSwitch");
  jest.isolateModules(() => {
    host = require("../host");
    killSwitch = require("../../consent/killSwitch");
  });
  return { ...host, ...killSwitch };
};

const config = { apiKey: "key", appID: "app", baseUrl: "https://api.example.com" };
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchConversionValueSchema", () => {
  it("sends the ETag and reads the schema, 304 and failures", async () => {
    const { createAttributionHost } = loadModules();
    const host = createAttributionHost(memoryStorage().storage, config);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ rules: [] }), { status: 200, headers: { ETag: '"v2"' } }),
    );
    expect(await host.fetchConversionValueSchema('"v1"')).toEqual({
      kind: "updated",
      body: { rules: [] },
      etag: '"v2"',
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/api/sdk/conversion-value-schema");
    expect(init.method).toBe("GET");
    expect(init.headers["If-None-Match"]).toBe('"v1"');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
    expect(await host.fetchConversionValueSchema('"v2"')).toEqual({ kind: "notModified" });

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect(await host.fetchConversionValueSchema(null)).toEqual({ kind: "failed" });
  });

  it("sends nothing while the SDK is off", async () => {
    const { createAttributionHost, configureKillSwitch, setEnabled } = loadModules();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { storage } = memoryStorage();
    configureKillSwitch(storage, config, async () => "device");
    setEnabled(false);
    fetchMock.mockClear();

    const host = createAttributionHost(storage, config);

    expect(await host.fetchConversionValueSchema(null)).toEqual({ kind: "failed" });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("conversion-value-schema"),
      expect.anything(),
    );
  });
});
