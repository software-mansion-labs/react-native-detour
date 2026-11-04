/** The user's choice from your consent platform, passed with `Detour.setConsent`. */
export type DetourConsent = {
  /** Purpose ID (`DetourPurpose`) → granted. A purpose missing from the map is not granted. */
  purposes: Record<string, boolean>;
  /** When the user made the choice. Defaults to the time of the `setConsent` call. */
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
