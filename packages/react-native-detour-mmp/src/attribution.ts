import type { DetourAttributionOption } from "@swmansion/react-native-detour";

/** Pass as `attribution` in the `DetourProvider` config to turn on attribution mode. */
export const attribution = (): DetourAttributionOption => ({ kind: "detour-attribution" });
