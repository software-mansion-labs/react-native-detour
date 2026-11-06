/** `X-SDK-Package` of every request: which Detour package the app installed. */
export type SdkPackage = "core" | "mmp";

// Metro bundles the marker of @swmansion/react-native-detour-mmp only when it can resolve the
// package, so installing it is what turns attribution on; the core SDK has no option for it.
const detectSdkPackage = (): SdkPackage => {
  try {
    require("@swmansion/react-native-detour-mmp/marker");
    return "mmp";
  } catch {
    return "core";
  }
};

export const SDK_PACKAGE: SdkPackage = detectSdkPackage();
