import type {
  DetourAttributionHost,
  DetourAttributionProvider,
} from "@swmansion/react-native-detour/attribution";

import { createConversionValueEngine } from "./conversionValue/engine";
import type { NativeAttribution } from "./native";

export type { NativeAttribution };

/** The options of `attribution()` with their defaults. */
export type ProviderOptions = {
  facebookAppId?: string;
  isChildDirected: boolean;
  readsIdfv: boolean;
  readsAppSetId: boolean;
};

export const createAttributionProvider = (
  native: NativeAttribution,
  { facebookAppId, isChildDirected, readsIdfv, readsAppSetId }: ProviderOptions,
): DetourAttributionProvider => {
  const engine = createConversionValueEngine(native);
  let host: DetourAttributionHost | null = null;

  return {
    didStart: (started) => {
      if (!native.isAvailable) return;
      host = started;
      const missingKeys = native.missingPostbackCopyKeys();
      if (missingKeys.length > 0) {
        console.warn(
          `🔗[Detour:ATTRIBUTION] Info.plist has no ${missingKeys.join(", ")}, so Detour gets no copies of winning postbacks. Add the @swmansion/react-native-detour-mmp config plugin, or the keys by hand (see the README).`,
        );
      }
      engine.start(started);
    },
    didLogConversion: (conversion) => {
      if (host) engine.logConversion(host, conversion);
    },
    matchFields: async () => {
      const asaToken = await native.attributionToken();
      return asaToken ? { asa_token: asaToken } : {};
    },
    // Read by the core SDK next to the match fields, so a failed read can be told from none.
    ...(facebookAppId && {
      metaInstallReferrer: () => native.metaInstallReferrer(facebookAppId),
    }),
    advertisingId: async () => (isChildDirected ? null : native.advertisingId()),
    attStatus: () => native.attStatus(),
    vendorId: async () => (readsIdfv && !isChildDirected ? native.vendorId() : null),
    appSetId: async () => (readsAppSetId && !isChildDirected ? native.appSetId() : null),
  };
};
