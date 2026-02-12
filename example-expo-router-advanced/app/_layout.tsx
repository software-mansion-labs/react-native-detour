import { Stack } from 'expo-router';
import { DetourProvider, type Config } from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/auth';

const detourConfig: Config = {
  API_KEY: 'API_KEY_PLACEHOLDER',
  appID: 'APP_ID_PLACEHOLDER',
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

const AppStack = () => {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      <Stack.Screen name="[...link]" options={{ headerShown: false }} />

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <AppStack />
      </DetourProvider>
    </AuthProvider>
  );
}
