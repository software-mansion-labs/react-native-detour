import { useEffect, useState } from "react";

import { Text, View } from "react-native";

import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";

import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { AuthProvider } from "./auth";
import { Navigation, type RootStackParamList } from "./navigation";
import { colors, styles } from "./styles";
import { useDetourGate } from "./useDetourGate";

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

const AppContent = ({
  navigationRef,
  isNavigationReady,
}: {
  navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>;
  isNavigationReady: boolean;
}) => {
  useDetourGate(navigationRef, isNavigationReady);
  return <Navigation />;
};

const AppRoot = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
      theme={{
        dark: true,
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "900" },
        },
      }}
    >
      <AppContent navigationRef={navigationRef} isNavigationReady={isNavigationReady} />
    </NavigationContainer>
  );
};

export function App() {
  if (!hasCredentials) {
    return <SetupRequired />;
  }

  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <AppRoot />
      </DetourProvider>
    </AuthProvider>
  );
}
