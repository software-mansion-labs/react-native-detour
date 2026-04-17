import { applicationName } from "expo-application";

import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

// Intercept mode: when a Detour host matches, land on "/" (styled root
// index, outside every protected group) instead of the resolved path.
// Navigating directly would paint /+not-found while Stack.Protected still
// has the target group unmounted — especially on runtime taps from the
// signed-out /sign-in screen, where there is no splash to hide the flash.
// The SDK resolves the link via Linking (cold start + addEventListener)
// and exposes it on useDetourContext().link; useDetourGate drives
// navigation from there with full auth awareness.
const detourHandler = createDetourNativeIntentHandler({
  hosts: [/\.godetour\.link$/i],
  fallbackPath: "/",
});

export async function redirectSystemPath(args: { path: string; initial: boolean }) {
  const detourResult = await detourHandler(args);
  if (detourResult !== args.path) {
    return detourResult;
  }

  const isUrlLike = args.path.includes("://") || args.path.startsWith("//");
  if (isUrlLike) {
    try {
      const url = new URL(args.path, `${applicationName}://app`);
      const isWebUrl = url.protocol === "http:" || url.protocol === "https:";
      if (!isWebUrl) {
        return `/third-party?raw=${encodeURIComponent(args.path)}`;
      }
    } catch {
      // Keep original path if parsing fails.
    }
  }

  return args.path;
}
