// Google libraries the app adds itself: each brings its own permission or Data safety
// declaration, so the SDK does not force them on every app.
const GOOGLE_LIBRARIES = {
  advertisingId: "com.google.android.gms:play-services-ads-identifier:18.1.0",
  appSetId: "com.google.android.gms:play-services-appset:16.1.0",
};

/**
 * Adds a library to the app's build.gradle once.
 * @param {string} buildGradle the app's android/app/build.gradle
 * @param {string} library a Maven coordinate from GOOGLE_LIBRARIES
 */
const addGoogleLibrary = (buildGradle, library) => {
  const name = library.split(":").slice(0, 2).join(":");
  if (buildGradle.includes(name)) return buildGradle;
  return buildGradle.replace(
    /dependencies\s*\{/,
    (block) => `${block}\n    implementation "${library}"`,
  );
};

module.exports = { GOOGLE_LIBRARIES, addGoogleLibrary };
