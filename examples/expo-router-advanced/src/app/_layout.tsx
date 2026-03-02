import { Stack } from 'expo-router';
import { DetourProvider, type Config } from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../auth';
import { DetourGate } from '../DetourGate';

const detourConfig: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  // In this example custom scheme links are handled by the user's custom native intent flow instead of Detour. See `+native-intent.tsx` for details.
  // Set to `'all'` (or omit, as it's the default) if you want Detour to also process custom scheme links.
  linkProcessingMode: 'web-only',
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
