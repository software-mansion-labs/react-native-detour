import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  DetourProvider,
  useDetourContext,
  type Config,
} from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';

const detourConfig: Config = {
  API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  linkProcessingMode: 'deferred-only',
};

SplashScreen.preventAutoHideAsync();

// Root navigator handles all deep link and  navigation after SDK processing.
const RootNavigator = () => {
  const { isLinkProcessed, linkRoute, linkType, clearLink } =
    useDetourContext();
  const router = useRouter();

  useEffect(() => {
    // Wait for the link to be processed before navigating
    if (!isLinkProcessed) return;

    // No link to handle: fall back to the entry route.
    if (!linkRoute) {
      SplashScreen.hideAsync();
      return;
    }

    // Navigate to resolved link
    router.replace({
      pathname: linkRoute,
      params: { fromDeepLink: 'true', linkType: linkType }, // Pass linkType as param for demonstration, you can remove this in your app
    });
    clearLink();

    // Hide the splash screen after navigation
    SplashScreen.hideAsync();
  }, [clearLink, isLinkProcessed, linkRoute, linkType, router]);

  if (!isLinkProcessed) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
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
