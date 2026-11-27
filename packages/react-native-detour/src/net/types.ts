import type { DetourAttStatus } from "../attribution/types";
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
  /** iOS, with the attribution package only: the core SDK has no native code to read it. */
  att_status?: DetourAttStatus;
};

/** `X-SDK-Package` of a request: whether the backend may use it for attribution. */
export type SdkPackage = "core" | "mmp";
