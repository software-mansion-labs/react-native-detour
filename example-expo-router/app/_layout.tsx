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

// Root navigator that waits for Detour to process the initial link and then redirects accordingly.
const RootNavigator = () => {
  const { isLinkProcessed, linkRoute } = useDetourContext();
  const router = useRouter();

  // Hide the splash screen once the initial link is processed.
  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hide();
    }
  }, [isLinkProcessed]);

  // If a link is processed and has a route, navigate there.
  useEffect(() => {
    if (!isLinkProcessed || !linkRoute) return;
    router.replace({ pathname: linkRoute, params: { fromDeepLink: 'true' } });
  }, [isLinkProcessed, linkRoute, router]);

  // While the initial link is being processed, we don't want to render the app
  if (!isLinkProcessed) {
    return null;
  }

  return <Stack />;
};

export default function RootLayout() {
  return (
    <DetourProvider config={detourConfig}>
      <RootNavigator />
    </DetourProvider>
  );
}
