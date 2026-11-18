import type { DetourAttributionProvider } from "@swmansion/react-native-detour";

import * as native from "./native";
import { createAttributionProvider } from "./provider";

// One provider per app, so the config gets the same object on every render.
const provider = createAttributionProvider(native);

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = (): DetourAttributionProvider => provider;
