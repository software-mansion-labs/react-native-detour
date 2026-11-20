import type { DetourConversion } from "../analytics/types/index";
import type { DetourStorage } from "../links/types";

/** A response to a GET that sends the last `ETag` as `If-None-Match`. */
export type DetourFetchResult =
  | { kind: "updated"; body: unknown; etag: string | null }
  | { kind: "notModified" }
  | { kind: "failed" };

/** What the core SDK lends the attribution package: the consent gate and the Detour API. */
export type DetourAttributionHost = {
  /** True while consent to `DetourPurpose.attribution` passed on this launch lets requests through. */
  isAttributionAllowed(): Promise<boolean>;
  /** Changes when the storage came back from a backup of another install. */
  installID(): Promise<string>;
  fetchConversionValueSchema(etag: string | null): Promise<DetourFetchResult>;
  /** The storage of the core SDK: the one from the config, or AsyncStorage. */
  storage: DetourStorage;
};

// PROVISIONAL: the field names until the contract defines meta_install_referrer.
/** The Meta Install Referrer for deferred matching (Android). The referrer stays encrypted. */
export type DetourMetaInstallReferrer = {
  install_referrer: string;
  /** True for a click, false for an ad view. */
  is_ct: boolean;
  /** Unix seconds of the click or view. */
  actual_timestamp: number;
  source_app: "facebook" | "instagram" | "facebook_lite";
};

/** Turns on attribution mode. Made by `attribution()` from @swmansion/react-native-detour-mmp. */
export type DetourAttributionProvider = {
  /** Called once, after `Detour.start()`. */
  didStart(host: DetourAttributionHost): void;
  /** Called with each valid conversion while consent to `DetourPurpose.attribution` lets requests through. */
  didLogConversion(conversion: DetourConversion): void;
  /** The Apple Search Ads token for deferred link matching, or null when there is none. */
  attributionToken(): Promise<string | null>;
  /** The Meta Install Referrer for deferred link matching, or null when there is none. */
  metaInstallReferrer(): Promise<DetourMetaInstallReferrer | null>;
};
