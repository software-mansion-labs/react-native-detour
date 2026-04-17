import { useEffect, useState } from "react";

import { Text, View } from "react-native";

import * as SplashScreen from "expo-splash-screen";

import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";

import { type Config, DetourProvider, useDetourContext } from "@swmansion/react-native-detour";

import { Navigation, type RootStackParamList } from "./navigation";
import { styles } from "./styles";

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

const detourConfig: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
};

SplashScreen.preventAutoHideAsync();

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);
  const { isLinkProcessed, link, clearLink } = useDetourContext();

  // Handle Detour resolved links.
  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !link) {
      return;
    }

    clearLink();

    // In this example, we only handle one specific link that resolves to the details screen with Detour to demonstrate the flow.
    // In a real app, you would likely have a more comprehensive mapping of Detour-resolved routes to in-app navigation targets.
    if (link.pathname === "/details") {
      navigationRef.navigate("Details", {
        linkParams: link.params,
        // Add deep link metadata to demonstrate route propagation.
        fromDeepLink: true,
        linkType: link.type,
      });
    } else {
      navigationRef.navigate("NotFound", {
        path: link.pathname,
        params: link.params,
      });
    }
  }, [clearLink, isLinkProcessed, isNavigationReady, link, navigationRef]);

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
    <NavigationContainer ref={navigationRef} onReady={() => setNavigationReady(true)}>
      <Navigation />
    </NavigationContainer>
  );
};

export function App() {
  if (!hasCredentials) {
    return <SetupRequired />;
  }

  return (
    <DetourProvider config={detourConfig}>
      <AppNavigator />
    </DetourProvider>
  );
}
