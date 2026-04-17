import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour/expo-router";

// Used only for runtime links. Cold-start links are handled by the SDK via
// Linking.getInitialURL() — the splash screen covers that async wait.
const detourHandler = createDetourNativeIntentHandler({
  hosts: [/\.godetour\.link$/i],
  fallbackPath: "/",
});

export async function redirectSystemPath(args: { path: string; initial: boolean }) {
  const detourResult = await detourHandler(args);
  if (detourResult !== args.path) {
    return detourResult;
  }

  // fallbackPath only applies to Detour host matches. Any other URL-like
  // path here (custom scheme such as myapp://details) would otherwise be passed through to Expo Router,
  // which would try to route to it and paint +not-found before
  // useDetourGate can react to link/auth state. Send it to "/" instead so
  // the SDK-resolved link in useDetourContext() drives navigation.
  if (args.path.includes("://") || args.path.startsWith("//")) {
    return "/";
  }

  return args.path;
}
