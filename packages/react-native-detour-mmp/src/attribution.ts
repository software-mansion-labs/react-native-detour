import type { DetourAttributionProvider } from "@swmansion/react-native-detour";

import { attributionToken } from "./native";

// One provider per app, so the config gets the same object on every render.
const provider: DetourAttributionProvider = {
  didStart: () => {},
  didLogConversion: () => {},
  attributionToken,
};

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = (): DetourAttributionProvider => provider;
