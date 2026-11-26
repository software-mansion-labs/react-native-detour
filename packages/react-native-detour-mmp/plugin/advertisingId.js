// The Google library that reads the AAID. The app adds it, because it brings the AD_ID
// permission and the Data safety declaration with it.
const ADVERTISING_ID_DEPENDENCY =
  'implementation "com.google.android.gms:play-services-ads-identifier:18.1.0"';

/**
 * Adds the library to the app's build.gradle once.
 * @param {string} buildGradle the app's android/app/build.gradle
 */
const addAdvertisingIdDependency = (buildGradle) => {
  if (buildGradle.includes("play-services-ads-identifier")) return buildGradle;
  return buildGradle.replace(
    /dependencies\s*\{/,
    (block) => `${block}\n    ${ADVERTISING_ID_DEPENDENCY}`,
  );
};

module.exports = { addAdvertisingIdDependency };
