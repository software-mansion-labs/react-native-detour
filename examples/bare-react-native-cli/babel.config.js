// `babel-preset-expo` (a superset of `@react-native/babel-preset`) pairs with
// `expo/metro-config` and enables inlining of `process.env.EXPO_PUBLIC_*` vars.
module.exports = function (api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
