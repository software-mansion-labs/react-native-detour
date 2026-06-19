// IMPORTANT: in a bare React Native CLI project that uses Expo Modules, the Metro
// config MUST extend `expo/metro-config` (a superset of `@react-native/metro-config`).
// `install-expo-modules` switches Android/iOS JS bundling to Expo CLI's `export:embed`,
// whose serializer expects this config. Using `@react-native/metro-config` here produces:
//   "Serializer did not return expected format ... Unexpected token 'v', "var __BUND"..."
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// --- pnpm monorepo wiring (so the example resolves the workspace copy of the SDK
// and a single copy of react / react-native). Not needed in a standalone app. ---
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
