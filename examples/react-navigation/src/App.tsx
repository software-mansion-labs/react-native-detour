import { useEffect } from "react";

import { Text, View } from "react-native";

import * as SplashScreen from "expo-splash-screen";

import { NavigationContainer } from "@react-navigation/native";

import {
  type Config,
  DetourProvider,
  useDetourReactNavigationLinking,
} from "@swmansion/react-native-detour";

import { Navigation, linkingConfig } from "./navigation";
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
  const linking = useDetourReactNavigationLinking({ config: linkingConfig });

  return (
    <NavigationContainer
      linking={linking}
      // Initial state waits for Detour.getInitialURL(), so onReady means deep-link state is resolved.
      onReady={() => SplashScreen.hideAsync()}
    >
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
