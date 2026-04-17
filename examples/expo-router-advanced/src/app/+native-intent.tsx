import { applicationName } from "expo-application";

import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

import { getAuthSnapshot } from "../authSnapshot";
import { setPendingLink } from "../pendingLink";
import { detourConfig } from "./_layout";

const detourHandler = createDetourNativeIntentHandler({
  hosts: [/\.godetour\.link$/i],
  config: detourConfig,
});

export async function redirectSystemPath(args: { path: string; initial: boolean }) {
  const detourResult = await detourHandler(args);

  if (detourResult !== args.path) {
    // Detour resolved this link.
    const { isLoaded, isSignedIn } = getAuthSnapshot();

    if (!isLoaded || !isSignedIn) {
      // Auth unknown (cold start) or user not signed in:
      // store the resolved destination for useDetourGate to pick up,
      // and return empty path to prevent navigation to a protected route.
      setPendingLink({ route: detourResult, type: "verified" });
      return "";
    }

    // User is signed in — navigate directly to the resolved route.
    return detourResult;
  }

  const isUrlLike = args.path.includes("://") || args.path.startsWith("//");
  if (isUrlLike) {
    try {
      const url = new URL(args.path, `${applicationName}://app`);
      const isWebUrl = url.protocol === "http:" || url.protocol === "https:";
      if (!isWebUrl) {
        const encodedOriginalPath = encodeURIComponent(args.path);
        return `/third-party?raw=${encodedOriginalPath}`;
      }
    } catch {
      // Keep original path if parsing fails.
    }
  }

  return args.path;
}
