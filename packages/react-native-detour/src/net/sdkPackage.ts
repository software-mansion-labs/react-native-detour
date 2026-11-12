import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import { setSdkPackageResolver } from "./client";
import type { SdkPackage } from "./types";

// Metro bundles the marker of @swmansion/react-native-detour-mmp only when it can resolve the
// package, so the attribution option does nothing in an app without the package.
const detectInstalledPackage = (): SdkPackage => {
  try {
    require("@swmansion/react-native-detour-mmp/marker");
    return "mmp";
  } catch {
    return "core";
  }
};

export const INSTALLED_PACKAGE: SdkPackage = detectInstalledPackage();

let isAttributionOn = false;
let hasWarned = false;

const warnOnce = (message: string) => {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(`🔗[Detour:CONFIG] ${message}`);
};

export const configureAttribution = (isOptionSet: boolean) => {
  isAttributionOn = isOptionSet && INSTALLED_PACKAGE === "mmp";
  setSdkPackageResolver(sdkPackageForRequest);
  if (isOptionSet && INSTALLED_PACKAGE === "core") {
    warnOnce(
      "attribution is set, but @swmansion/react-native-detour-mmp is not installed. Requests do not feed attribution.",
    );
  } else if (!isOptionSet && INSTALLED_PACKAGE === "mmp") {
    warnOnce(
      "@swmansion/react-native-detour-mmp is installed, but attribution is off. Pass attribution() from it in the config to turn it on.",
    );
  }
};

// The backend attributes every mmp request, so a request goes as core until the attribution
// gate lets it through. It never waits for consent and never fails the request: a deep link must
// not be held back, so a gate that cannot be read counts as closed.
export const sdkPackageForRequest = async (): Promise<SdkPackage> => {
  if (!isAttributionOn) return "core";
  try {
    const decision = await decideNow(DetourPurpose.attribution);
    return decision === "send" ? "mmp" : "core";
  } catch {
    return "core";
  }
};
