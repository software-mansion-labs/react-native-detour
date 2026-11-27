import { Platform } from "react-native";

import type { DetourAttributionProvider } from "@swmansion/react-native-detour/attribution";

import * as native from "./native";
import { type ProviderOptions, createAttributionProvider } from "./provider";

export type DetourAttributionOptions = {
  /** Your Facebook app ID. With it, the SDK reads the Meta Install Referrer on Android. */
  facebookAppId?: string;
  /** `true` for an app for children (COPPA, Google Play Families, App Store Kids): no device identifier is read. */
  isChildDirected?: boolean;
  /** `false` keeps the IDFV on the device, also when the Detour server turns it on (iOS). */
  readsIdfv?: boolean;
  /**
   * `false` keeps the App Set ID on the device, also when the Detour server turns it on (Android).
   */
  readsAppSetId?: boolean;
};

// One provider per set of options, so the config gets the same object on every render.
const providers = new Map<string, DetourAttributionProvider>();

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = ({
  facebookAppId,
  isChildDirected = false,
  readsIdfv = true,
  readsAppSetId = true,
}: DetourAttributionOptions = {}): DetourAttributionProvider => {
  const options: ProviderOptions = {
    // iOS has no Meta Install Referrer, so the ID would only make the SDK note a read of nothing.
    facebookAppId: Platform.OS === "android" ? facebookAppId?.trim() || undefined : undefined,
    isChildDirected,
    readsIdfv,
    readsAppSetId,
  };
  const key = JSON.stringify(options);
  let provider = providers.get(key);
  if (!provider) {
    provider = createAttributionProvider(native, options);
    providers.set(key, provider);
  }
  return provider;
};
