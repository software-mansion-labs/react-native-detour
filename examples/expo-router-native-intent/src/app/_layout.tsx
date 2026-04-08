import { useEffect } from "react";

import { Image, Text, View } from "react-native";

import { type Router, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import { type Config, DetourProvider, useDetourContext } from "@swmansion/react-native-detour";

import { colors, styles } from "../styles";

export const DetourLogo = () => (
  <Image
    source={require("../../assets/detour-logo-transparent.png")}
    style={{ width: 32, height: 32 }}
    resizeMode="contain"
  />
);

type AppHref = Parameters<Router["replace"]>[0];

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
  linkProcessingMode: "deferred-only",
};

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.background);

// Root navigator handles all deep link navigation after SDK processing.
// Universal / App links are resolved in +native-intent.tsx (mapToRoute strips the Detour hash).
// Only deferred links go through DetourProvider (linkProcessingMode: "deferred-only").
const RootNavigator = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed) return;

    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    router.replace({
      pathname: link.pathname,
      params: { fromDeepLink: "true", linkType: link.type, ...link.params },
    } as AppHref);
    clearLink();

    SplashScreen.hideAsync();
  }, [clearLink, isLinkProcessed, link, router]);

  if (!isLinkProcessed) {
    return null;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
    </Stack>
  );
};

export default function RootLayout() {
  if (!hasCredentials) {
    return <SetupRequired />;
  }

  return (
    <DetourProvider config={detourConfig}>
      <RootNavigator />
    </DetourProvider>
  );
}
