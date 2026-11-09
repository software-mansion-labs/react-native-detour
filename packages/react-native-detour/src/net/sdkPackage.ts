import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";

/** `X-SDK-Package` of a request: whether the backend may use it for attribution. */
export type SdkPackage = "core" | "mmp";

// Metro bundles the marker of @swmansion/react-native-detour-mmp only when it can resolve the
// package, so installing it is what turns attribution mode on; the core SDK has no option for it.
const detectInstalledPackage = (): SdkPackage => {
  try {
    require("@swmansion/react-native-detour-mmp/marker");
    return "mmp";
  } catch {
    return "core";
  }
};

export const INSTALLED_PACKAGE: SdkPackage = detectInstalledPackage();

// The backend attributes every mmp request, so a request goes as core until the attribution
// gate lets it through. It never waits for consent: a deep link must not be held back.
export const sdkPackageForRequest = async (): Promise<SdkPackage> => {
  if (INSTALLED_PACKAGE === "core") return "core";
  const decision = await decideNow(DetourPurpose.attribution);
  return decision === "send" ? "mmp" : "core";
};
