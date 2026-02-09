import { Stack, usePathname, useRouter } from 'expo-router';
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

const RootNavigator = () => {
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hide();
    }
  }, [isLinkProcessed]);

  useEffect(() => {
    if (!isLinkProcessed || !linkRoute) return;
    // If the processed link matches a known route, navigate there.
    if (pathname !== linkRoute) {
      router.replace(linkRoute);
      return;
    }
    // Clear the link if we're already on the target route to prevent loops.
    clearLink();
  }, [clearLink, isLinkProcessed, linkRoute, pathname, router]);

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
