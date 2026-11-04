import * as Application from "expo-application";
import * as Localization from "expo-localization";

import { sessionManager } from "../analytics/session/sessionManager";
import { getConsentPassedThisLaunch } from "../consent/consent";
import type { ConsentWire } from "../consent/types";
import { getSyncDeviceInfo } from "../links/utils/deviceInfo";

type ExpoNetworkModule = {
  getNetworkStateAsync?: () => Promise<{ type?: string }>;
};

// Optional peer: without expo-network the context goes without network_type.
// Metro needs a string literal in require() at bundle time.
const expoNetwork = (() => {
  try {
    return require("expo-network") as ExpoNetworkModule;
  } catch {
    return null;
  }
})();

const NETWORK_TYPES: Record<string, string> = { WIFI: "wifi", CELLULAR: "cellular" };
const UNKNOWN_NETWORK_TYPES = new Set(["NONE", "UNKNOWN"]);

/** App and device context sent with every request next to the request's own fields. */
export type RequestContext = {
  app_version?: string;
  build_number?: string;
  os_version?: string;
  network_type?: string;
  locale?: string;
  session_id?: string;
  consent_snapshot?: ConsentWire;
};

const readNetworkType = async (): Promise<string | undefined> => {
  try {
    const state = await expoNetwork?.getNetworkStateAsync?.();
    if (!state?.type || UNKNOWN_NETWORK_TYPES.has(state.type)) return undefined;
    return NETWORK_TYPES[state.type] ?? "other";
  } catch {
    return undefined;
  }
};

const readOsVersion = (): string | undefined => {
  try {
    const { osVersion } = getSyncDeviceInfo();
    return osVersion === "unknown" ? undefined : osVersion;
  } catch {
    return undefined;
  }
};

/** match-link keeps `locale` as its v1 array of device signals, so `forMatchLink` leaves it out. */
export const getRequestContext = async ({
  forMatchLink = false,
}: { forMatchLink?: boolean } = {}): Promise<RequestContext> => {
  const fields: RequestContext = {
    app_version: Application.nativeApplicationVersion ?? undefined,
    build_number: Application.nativeBuildVersion ?? undefined,
    os_version: readOsVersion(),
    network_type: await readNetworkType(),
    locale: forMatchLink ? undefined : Localization.getLocales()[0]?.languageTag,
    session_id: sessionManager.currentSessionId ?? undefined,
    consent_snapshot: getConsentPassedThisLaunch() ?? undefined,
  };
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as RequestContext;
};
