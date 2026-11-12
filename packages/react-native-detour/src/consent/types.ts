/** The user's choice from your consent platform, passed with `Detour.setConsent`. */
export type DetourConsent = {
  /** Purpose ID (`DetourPurpose`) → granted. A purpose missing from the map is not granted. */
  purposes: Record<string, boolean>;
  /**
   * When the user made the choice. Without it, an unchanged choice keeps the time it was first
   * passed, and a new one gets the time of the `setConsent` call.
   */
  timestamp?: Date;
  /** The version of the consent text the user saw, for example the consent platform's version. */
  consentTextRef?: string;
  /** Version of the purpose list. Defaults to the version from the Detour server. */
  schemaVersion?: number;
  /** The user's legal regime, for example `eea`. */
  region?: string;
  /** Where the choice came from, for example `cmp`. */
  source?: string;
};

/** The consent as the API contract sends it, also used to store it on the device. */
export type ConsentWire = {
  purposes: Record<string, boolean>;
  timestamp: string;
  consent_text_ref?: string;
  schema_version?: number;
  region?: string;
  source?: string;
};

/** `open` sends while the app has not passed a consent decision; `closed` waits for `setConsent`. */
export type ConsentGateDefault = "open" | "closed";

/** The per-app values from `GET /api/sdk/config` that the SDK uses. */
export type SdkConfig = {
  schemaVersion: number;
  consentGateDefaults: Record<string, ConsentGateDefault>;
};

/** `wait` keeps the request until the app passes a consent that decides it. */
export type GateDecision = "send" | "wait" | "drop";

export type Identity = () => Promise<{ deviceId: string; userId: string | null }>;
