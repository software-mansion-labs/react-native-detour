const { WarningAggregator, withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

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

/** @param {{ metaInstallReferrer?: boolean }} [props] */
module.exports = (config, { metaInstallReferrer = false } = {}) => {
  const withEndpoints = withPostbackCopyEndpoints(config);
  return metaInstallReferrer ? withMetaAppQueries(withEndpoints) : withEndpoints;
};
