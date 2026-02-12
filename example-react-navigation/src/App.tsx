import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import {
  DetourProvider,
  type Config,
  useDetourContext,
} from '@swmansion/react-native-detour';
import { Navigation } from './navigation';
import { AuthProvider } from './AuthContext';

const detourConfig: Config = {
  API_KEY: 'API_KEY_PLACEHOLDER',
  appID: 'APP_ID_PLACEHOLDER',
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

const AppNavigator = () => {
  const { isLinkProcessed } = useDetourContext();

  // Hide the splash screen once the initial link is processed (or determined to be absent).
  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hideAsync();
    }
  }, [isLinkProcessed]);

  // While the initial link is being processed, we don't want to render the app
  if (!isLinkProcessed) {
    return null;
  }

  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
};

export function App() {
  return (
    <DetourProvider config={detourConfig}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </DetourProvider>
  );
}
