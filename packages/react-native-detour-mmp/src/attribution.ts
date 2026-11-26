import type { DetourAttributionProvider } from "@swmansion/react-native-detour/attribution";

import * as native from "./native";
import { createAttributionProvider } from "./provider";

export type DetourAttributionOptions = {
  /** Your Facebook app ID. With it, the SDK reads the Meta Install Referrer on Android. */
  facebookAppId?: string;
  /** `true` for an app for children (COPPA, Google Play Families, App Store Kids): no device identifier is read. */
  isChildDirected?: boolean;
  /** `false` keeps the IDFV on the device, also when the Detour server turns it on (iOS). */
  readsIdfv?: boolean;
};

// One provider per set of options, so the config gets the same object on every render.
const providers = new Map<string, DetourAttributionProvider>();

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = ({
  facebookAppId,
  isChildDirected = false,
  readsIdfv = true,
}: DetourAttributionOptions = {}): DetourAttributionProvider => {
  const appId = facebookAppId?.trim() || undefined;
  const key = JSON.stringify([appId, isChildDirected, readsIdfv]);
  let provider = providers.get(key);
  if (!provider) {
    provider = createAttributionProvider(native, appId, isChildDirected, readsIdfv);
    providers.set(key, provider);
  }
  return provider;
};
