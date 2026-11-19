const { WarningAggregator, withInfoPlist } = require("expo/config-plugins");

const { DETOUR_ENDPOINT, addPostbackCopyEndpoints } = require("./plugin/postbackCopyEndpoints");

const PLUGIN_NAME = "@swmansion/react-native-detour-mmp";

module.exports = (config) =>
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
