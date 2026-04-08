import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { AuthProvider, useAuth } from "../auth";
import { colors } from "../styles";
import { useDetourGate } from "../useDetourGate";

export const detourConfig: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.background);

const rootScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};

const headerScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
};

const AppStack = () => {
  const { isSignedIn } = useAuth();
  useDetourGate();

  return (
    <Stack screenOptions={rootScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="third-party" options={{ ...headerScreenOptions, title: "Third-party" }} />
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
