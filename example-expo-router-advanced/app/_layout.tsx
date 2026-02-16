import { Stack } from 'expo-router';
import { DetourProvider, type Config } from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/auth';
import { DetourGate } from '../src/DetourGate';

const detourConfig: Config = {
  API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

const AppStack = () => {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="third-party" options={{ title: 'Third-party' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

// Root layout that sets up the DetourProvider and coordinates it with auth-aware routing.
export default function RootLayout() {
  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <DetourGate />
        <AppStack />
      </DetourProvider>
    </AuthProvider>
  );
}
