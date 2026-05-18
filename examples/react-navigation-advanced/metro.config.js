const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const monorepoRoot = path.resolve(__dirname, "../..");
const appNodeModules = path.resolve(__dirname, "node_modules");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["react-native", "require", "default"];
config.resolver.nodeModulesPaths = [appNodeModules, rootNodeModules];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: path.resolve(rootNodeModules, "react"),
  "react/jsx-runtime": path.resolve(rootNodeModules, "react/jsx-runtime.js"),
  "react/jsx-dev-runtime": path.resolve(rootNodeModules, "react/jsx-dev-runtime.js"),
  "react-native": path.resolve(rootNodeModules, "react-native"),
};

module.exports = config;
