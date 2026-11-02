jest.mock("expo-application", () => ({
  nativeApplicationVersion: "4.2.0",
  nativeBuildVersion: "421",
}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "pl-PL" }] }));
jest.mock("../../links/utils/deviceInfo", () => ({
  getSyncDeviceInfo: () => ({ model: "Pixel 8", osVersion: "14" }),
}));

const loadWithNetwork = (network: () => object) => {
  let module: typeof import("../requestContext") | undefined;
  jest.isolateModules(() => {
    jest.doMock("expo-network", network, { virtual: true });
    module = require("../requestContext");
  });
  return module!;
};

describe("getRequestContext", () => {
  it("sends the app, OS, locale and network fields", async () => {
    const { getRequestContext } = loadWithNetwork(() => ({
      getNetworkStateAsync: async () => ({ type: "WIFI" }),
    }));

    expect(await getRequestContext()).toEqual({
      app_version: "4.2.0",
      build_number: "421",
      os_version: "14",
      network_type: "wifi",
      locale: "pl-PL",
    });
  });

  it("leaves locale out for match-link", async () => {
    const { getRequestContext } = loadWithNetwork(() => ({}));

    expect(await getRequestContext({ forMatchLink: true })).not.toHaveProperty("locale");
  });

  it("works without expo-network", async () => {
    const { getRequestContext } = loadWithNetwork(() => {
      throw new Error("Cannot find module 'expo-network'");
    });

    expect(await getRequestContext()).not.toHaveProperty("network_type");
  });
});
