/**
 * Purpose IDs for `DetourConsent.purposes`. Strings, not an enum, so a purpose added on the
 * Detour server can be passed before the SDK knows it.
 */
export const DetourPurpose = {
  /** Events, sessions and conversions stored for your statistics. */
  analytics: "analytics",
  /** Assigning an install to a campaign. */
  attribution: "attribution",
  /** Sending install and conversion data to ad networks. */
  adNetworkSharing: "ad_network_sharing",
  /** Ad personalization, for example Google's `ad_personalization`. */
  adPersonalization: "ad_personalization",
} as const;
