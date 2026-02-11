import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  DetourProvider,
  useDetourContext,
  type Config,
} from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';

const detourConfig: Config = {
  API_KEY: 'API_KEY_PLACEHOLDER',
  appID: 'APP_ID_PLACEHOLDER',
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

// Root navigator handles all deep link and  navigation after SDK processing.
const RootNavigator = () => {
  const { isLinkProcessed, linkRoute, linkType } = useDetourContext();
  const router = useRouter();

  // Hide the splash screen once the initial link is processed (or determined to be absent).
  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hideAsync();
    }
  }, [isLinkProcessed]);

  // Navigate to resolved link
  // TODO: Add state reset in SDK hook Universal/App link `addEventListener` to ensure re-render for duplicate links
  useEffect(() => {
    if (!isLinkProcessed || !linkRoute) return;

    console.log(`[Root Navigator] Navigating to ${linkType} link:`, linkRoute);
    router.replace({
      pathname: linkRoute,
      params: { fromDeepLink: 'true', linkType: linkType },
    });
  }, [isLinkProcessed, linkRoute, linkType, router]);

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
