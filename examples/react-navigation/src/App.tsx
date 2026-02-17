import { useEffect, useState } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import {
  DetourProvider,
  type Config,
  useDetourContext,
} from '@swmansion/react-native-detour';
import { Navigation, type RootStackParamList } from './navigation';

const detourConfig: Config = {
  API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();

  // Handle Detour resolved links.
  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !linkRoute) {
      return;
    }

    const path = linkRoute.split('?')[0] || '/';
    clearLink();

    // In this example, we only handle one specific link that resolves to the details screen with Detour to demonstrate the flow.
    // In a real app, you would likely have a more comprehensive mapping of Detour-resolved routes to in-app navigation targets.
    if (path === '/details') {
      navigationRef.navigate('Details', { fromDeepLink: true }); // Add deep link metadata to demonstrate route propagation.
    }
  }, [clearLink, isLinkProcessed, isNavigationReady, linkRoute, navigationRef]);

  // Hide the splash screen once the initial link is processed (or determined to be absent).
  useEffect(() => {
    if (isLinkProcessed && isNavigationReady) {
      SplashScreen.hideAsync();
    }
  }, [isLinkProcessed, isNavigationReady]);

  // While the initial link is being processed, we don't want to render the app
  if (!isLinkProcessed) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
    >
      <Navigation />
    </NavigationContainer>
  );
};

export function App() {
  return (
    <DetourProvider config={detourConfig}>
      <AppNavigator />
    </DetourProvider>
  );
}
