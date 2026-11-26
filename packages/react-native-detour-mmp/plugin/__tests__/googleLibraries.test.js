const { GOOGLE_LIBRARIES, addGoogleLibrary } = require("../googleLibraries");

const BUILD_GRADLE = `android {
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

describe("addGoogleLibrary", () => {
  it("adds the library to the app's dependencies", () => {
    expect(addGoogleLibrary(BUILD_GRADLE, GOOGLE_LIBRARIES.advertisingId)).toContain(
      'dependencies {\n    implementation "com.google.android.gms:play-services-ads-identifier:18.1.0"',
    );
  });

  it("adds each library once", () => {
    const once = addGoogleLibrary(BUILD_GRADLE, GOOGLE_LIBRARIES.appSetId);
    expect(addGoogleLibrary(once, GOOGLE_LIBRARIES.appSetId)).toBe(once);
    expect(addGoogleLibrary(once, GOOGLE_LIBRARIES.advertisingId)).toContain(
      "play-services-ads-identifier",
    );
  });
});
