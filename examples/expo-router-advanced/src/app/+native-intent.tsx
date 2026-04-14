import { applicationName } from "expo-application";

import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

import { detourConfig } from "./_layout";

const detourHandler = createDetourNativeIntentHandler({
  config: detourConfig,
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
        const encodedOriginalPath = encodeURIComponent(args.path);
        return `/third-party?raw=${encodedOriginalPath}`;
      }
    } catch {
      // Keep original path if parsing fails.
    }
  }

  return args.path;
}
