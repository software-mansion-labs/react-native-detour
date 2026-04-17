import { useEffect } from "react";

import { Text, View } from "react-native";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { AuthProvider, useAuth } from "../auth";
import { colors, styles } from "../styles";
import { useDetourGate } from "../useDetourGate";

const hasCredentials =
  !!process.env.EXPO_PUBLIC_DETOUR_API_KEY && !!process.env.EXPO_PUBLIC_DETOUR_APP_ID;

const SetupRequired = () => {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Setup Required</Text>
        <Text style={styles.subtitle}>
          Copy <Text style={styles.accent}>.env.example</Text> to{" "}
          <Text style={styles.accent}>.env</Text> and add your Detour credentials from the panel
          before running this example.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.code}>EXPO_PUBLIC_DETOUR_API_KEY=...</Text>
        <Text style={styles.code}>EXPO_PUBLIC_DETOUR_APP_ID=...</Text>
      </View>
    </View>
  );
};

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
      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

export default function RootLayout() {
  if (!hasCredentials) {
    return <SetupRequired />;
  }

  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <AppStack />
      </DetourProvider>
    </AuthProvider>
  );
}
