const {
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withInfoPlist,
} = require("expo/config-plugins");

const { GOOGLE_LIBRARIES, addGoogleLibrary } = require("./plugin/googleLibraries");
const { addMetaAppQueries } = require("./plugin/metaAppQueries");
const { DETOUR_ENDPOINT, addPostbackCopyEndpoints } = require("./plugin/postbackCopyEndpoints");

const PLUGIN_NAME = "@swmansion/react-native-detour-mmp";

const withPostbackCopyEndpoints = (config) =>
  withInfoPlist(config, (modConfig) => {
    const { infoPlist, keptKeys } = addPostbackCopyEndpoints(modConfig.modResults);
    for (const key of keptKeys) {
      WarningAggregator.addWarningIOS(
        PLUGIN_NAME,
        `${key} is already set, so Apple sends postback copies there and not to ${DETOUR_ENDPOINT}.`,
      );
    }
    modConfig.modResults = infoPlist;
    return modConfig;
  });

const withMetaAppQueries = (config) =>
  withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = addMetaAppQueries(modConfig.modResults);
    return modConfig;
  });

const withGoogleLibrary = (config, library) =>
  withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = addGoogleLibrary(modConfig.modResults.contents, library);
    return modConfig;
  });

/** @param {{ metaInstallReferrer?: boolean, advertisingId?: boolean, appSetId?: boolean }} [props] */
module.exports = (
  config,
  { metaInstallReferrer = false, advertisingId = false, appSetId = false } = {},
) => {
  let result = withPostbackCopyEndpoints(config);
  if (metaInstallReferrer) result = withMetaAppQueries(result);
  if (advertisingId) result = withGoogleLibrary(result, GOOGLE_LIBRARIES.advertisingId);
  if (appSetId) result = withGoogleLibrary(result, GOOGLE_LIBRARIES.appSetId);
  return result;
};
