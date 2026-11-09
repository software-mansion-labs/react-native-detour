import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";

/** `X-SDK-Package` of a request: whether the backend may use it for attribution. */
export type SdkPackage = "core" | "mmp";

/** Turns on attribution mode. Made by `attribution()` from @swmansion/react-native-detour-mmp. */
export type DetourAttributionOption = { readonly kind: "detour-attribution" };

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
// gate lets it through. It never waits for consent: a deep link must not be held back.
export const sdkPackageForRequest = async (): Promise<SdkPackage> => {
  if (!isAttributionOn) return "core";
  const decision = await decideNow(DetourPurpose.attribution);
  return decision === "send" ? "mmp" : "core";
};
