import type { ConsentWire } from "../consent/types";

export type DetourRequestConfig = {
  apiKey: string;
  appID: string;
  baseUrl?: string;
};

/** App and device context added to analytics and deferred-matching requests. */
export type RequestContext = {
  app_version?: string;
  build_number?: string;
  os_version?: string;
  network_type?: string;
  locale?: string;
  session_id?: string;
  consent_snapshot?: ConsentWire;
};

/** `X-SDK-Package` of a request: whether the backend may use it for attribution. */
export type SdkPackage = "core" | "mmp";

/** Turns on attribution mode. Made by `attribution()` from @swmansion/react-native-detour-mmp. */
export type DetourAttributionOption = { readonly kind: "detour-attribution" };
