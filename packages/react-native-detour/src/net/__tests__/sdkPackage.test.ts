const loadSdkPackage = () => {
  let sdkPackage!: typeof import("../sdkPackage");
  jest.isolateModules(() => {
    sdkPackage = require("../sdkPackage");
  });
  return sdkPackage.SDK_PACKAGE;
};

afterEach(() => {
  jest.dontMock("@swmansion/react-native-detour-mmp/marker");
});

// In this monorepo the package may be resolvable, so its absence is simulated.
it("reports core without the attribution package", () => {
  jest.doMock(
    "@swmansion/react-native-detour-mmp/marker",
    () => {
      throw new Error("Cannot find module");
    },
    { virtual: true },
  );
  expect(loadSdkPackage()).toBe("core");
});

it("reports mmp when the app installed the attribution package", () => {
  jest.doMock("@swmansion/react-native-detour-mmp/marker", () => ({}), { virtual: true });
  expect(loadSdkPackage()).toBe("mmp");
});
