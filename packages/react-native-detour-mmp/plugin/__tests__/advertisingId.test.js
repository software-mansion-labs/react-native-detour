const { addAdvertisingIdDependency } = require("../advertisingId");

const BUILD_GRADLE = `android {
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

describe("addAdvertisingIdDependency", () => {
  it("adds the library to the app's dependencies", () => {
    expect(addAdvertisingIdDependency(BUILD_GRADLE)).toContain(
      'dependencies {\n    implementation "com.google.android.gms:play-services-ads-identifier:18.1.0"',
    );
  });

  it("adds it once", () => {
    const once = addAdvertisingIdDependency(BUILD_GRADLE);
    expect(addAdvertisingIdDependency(once)).toBe(once);
  });
});
