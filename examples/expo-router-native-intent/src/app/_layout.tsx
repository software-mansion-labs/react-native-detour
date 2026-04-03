import { useEffect } from "react";

import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { type Config, DetourProvider, useDetourContext } from "@swmansion/react-native-detour";

const detourConfig: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  linkProcessingMode: "deferred-only",
};

SplashScreen.preventAutoHideAsync();

// Root navigator handles all deep link and  navigation after SDK processing.
const RootNavigator = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const router = useRouter();

  useEffect(() => {
    // Wait for the link to be processed before navigating
    if (!isLinkProcessed) return;

    // No link to handle: fall back to the entry route.
    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    // Navigate to resolved link
    router.replace({
      pathname: link.pathname,
      // Except of link query params the debuging params are passed here to show how link data was processed.
      // You can remove them in production.
      params: { fromDeepLink: "true", linkType: link.type, ...link.params },
    });
    clearLink();

    // Hide the splash screen after navigation
    SplashScreen.hideAsync();
  }, [clearLink, isLinkProcessed, link, router]);

  if (!isLinkProcessed) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="details" options={{ title: "Details" }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <DetourProvider config={detourConfig}>
      <RootNavigator />
    </DetourProvider>
  );
}
