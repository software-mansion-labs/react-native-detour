import type { DetourConversion } from "../analytics/types/index";
import type { DetourStorage } from "../links/types";
import type { DetourFetchResult } from "../net/fetchWithETag";

export type { DetourFetchResult };

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

// PROVISIONAL: the field names of meta_install_referrer may still change.
/** The Meta Install Referrer for deferred matching (Android). The referrer stays encrypted. */
export type DetourMetaInstallReferrer = {
  install_referrer: string;
  /** True for a click, false for an ad view. */
  is_ct: boolean;
  /** Unix seconds of the click or view. */
  actual_timestamp: number;
  source_app: "facebook" | "instagram" | "facebook_lite";
};

/** The App Tracking Transparency status (iOS), as Apple's `ATTrackingManager.AuthorizationStatus`. */
export type DetourAttStatus = "not_determined" | "restricted" | "denied" | "authorized";

/** `advertising_id` in Detour requests: the IDFA (iOS) or the AAID (Android). */
export type DetourAdvertisingId = { id: string; type: "idfa" | "aaid" };

/** The attribution package's fields of the deferred link request. */
export type DetourAttributionMatchFields = {
  /** The Apple Search Ads token (iOS). */
  asa_token?: string;
  meta_install_referrer?: DetourMetaInstallReferrer;
};

/** Turns on attribution mode. Made by `attribution()` from @swmansion/react-native-detour-mmp. */
export type DetourAttributionProvider = {
  /** Called once, after `Detour.start()` and after the consent to attribution is decided. */
  didStart(host: DetourAttributionHost): void;
  /** Called with each valid conversion while consent to `DetourPurpose.attribution` lets requests through. */
  didLogConversion(conversion: DetourConversion): void;
  /**
   * The fields this package adds to the first deferred link request. The core SDK waits for them
   * at most 2 s; a Meta Install Referrer that comes later is sent on its own.
   */
  matchFields(): Promise<DetourAttributionMatchFields>;
  /**
   * The advertising ID when the user allowed tracking (iOS) or did not opt out of ads
   * personalization (Android), or null. Rejects when the read failed, so the core SDK keeps the
   * ID the server has. The core SDK sends it only with consent to `DetourPurpose.adNetworkSharing`
   * and when the Detour server turns it on for the app.
   */
  advertisingId?(): Promise<DetourAdvertisingId | null>;
  /**
   * The ATT status (iOS), or null on Android. Read only: it goes with every request as
   * `att_status` and is never treated as consent.
   */
  attStatus?(): Promise<DetourAttStatus | null>;
};
