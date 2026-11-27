import type {
  DetourAttributionHost,
  DetourAttributionMatchFields,
  DetourAttributionProvider,
} from "@swmansion/react-native-detour/attribution";

import { createConversionValueEngine } from "./conversionValue/engine";
import type { NativeAttribution } from "./native";

export type { NativeAttribution };

export const createAttributionProvider = (
  native: NativeAttribution,
  facebookAppId?: string,
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
    // Both count against the core SDK's 2 s limit for the match fields, so they run together. A
    // core SDK that reads Meta's on its own, through `metaInstallReferrer`, asks without it.
    matchFields: async (options): Promise<DetourAttributionMatchFields> => {
      const readsMeta = facebookAppId && !options?.withoutMetaInstallReferrer;
      const [asaToken, metaReferrer] = await Promise.all([
        native.attributionToken(),
        readsMeta ? native.metaInstallReferrer(facebookAppId).catch(() => null) : null,
      ]);
      return {
        ...(asaToken && { asa_token: asaToken }),
        ...(metaReferrer && { meta_install_referrer: metaReferrer }),
      };
    },
    ...(facebookAppId && {
      metaInstallReferrer: () => native.metaInstallReferrer(facebookAppId),
    }),
  };
};
