import { setSdkPackageResolver } from "../net/client";
import type { SdkPackage } from "../net/types";
import {
  hasAttributionProvider,
  isAttributionAllowed,
  setAttributionProvider,
} from "./attributionMode";
import type { DetourAttributionProvider } from "./types";

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

let hasWarned = false;

const warnOnce = (message: string) => {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(`🔗[Detour:CONFIG] ${message}`);
};

export const configureAttribution = (option: DetourAttributionProvider | undefined) => {
  const isOptionSet = option !== undefined;
  setAttributionProvider(INSTALLED_PACKAGE === "mmp" ? (option ?? null) : null);
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
// gate lets it through.
export const sdkPackageForRequest = async (): Promise<SdkPackage> =>
  hasAttributionProvider() && (await isAttributionAllowed()) ? "mmp" : "core";
