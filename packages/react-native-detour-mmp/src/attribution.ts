import type { DetourAttributionProvider } from "@swmansion/react-native-detour";

import * as native from "./native";
import { createAttributionProvider } from "./provider";

export type DetourAttributionOptions = {
  /** Your Facebook app ID. With it, the SDK reads the Meta Install Referrer on Android. */
  facebookAppId?: string;
};

// One provider per app ID, so the config gets the same object on every render.
const providers = new Map<string | undefined, DetourAttributionProvider>();

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = ({
  facebookAppId,
}: DetourAttributionOptions = {}): DetourAttributionProvider => {
  const appId = facebookAppId?.trim() || undefined;
  let provider = providers.get(appId);
  if (!provider) {
    provider = createAttributionProvider(native, appId);
    providers.set(appId, provider);
  }
  return provider;
};
