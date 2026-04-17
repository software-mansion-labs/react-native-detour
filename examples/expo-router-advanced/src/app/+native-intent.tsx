import { applicationName } from "expo-application";

import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

import { detourConfig } from "./_layout";

// Used only for runtime links. Cold-start links are handled by the SDK via
// Linking.getInitialURL() — the splash screen covers that async wait.
const detourHandler = createDetourNativeIntentHandler({
  hosts: [/\.godetour\.link$/i],
  config: detourConfig,
});

export async function redirectSystemPath(args: { path: string; initial: boolean }) {
  const isUrlLike = args.path.includes("://") || args.path.startsWith("//");

  if (isUrlLike) {
    try {
      const url = new URL(args.path, `${applicationName}://app`);
      const isWebUrl = url.protocol === "http:" || url.protocol === "https:";

      if (isWebUrl) {
        if (args.initial) {
          // Cold start: return "" — SDK resolves via Linking.getInitialURL().
          // The splash screen in useDetourGate covers the async wait.
          return "";
        }
        // Runtime: resolve directly to avoid a +not-found flash while the SDK
        // resolves asynchronously. The SDK also fires Linking.addEventListener
        // and sets `link` in context; useDetourGate will replace to the same
        // destination once more, this time with deep-link params attached.
        const result = await detourHandler(args);
        return result !== args.path ? result : "";
      }

      // Custom scheme link (e.g. detour-expo-router-advanced://details).
      return `/third-party?raw=${encodeURIComponent(args.path)}`;
    } catch {
      // Keep original path if parsing fails.
    }
  }

  return args.path;
}
