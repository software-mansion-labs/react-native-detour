import { useMemo, useState } from "react";

import { Linking } from "react-native";

import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

import {
  type LinkingOptions,
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";

import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { AuthProvider } from "./auth";
import { Navigation, type RootStackParamList } from "./navigation";
import { APP_SCHEME_PREFIX, isAppSchemeUrl } from "./navigation/helpers";
import { useDetourGate } from "./useDetourGate";
import { colors } from "./styles";

const detourConfig: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  // HTTP(S) links handled by Detour. Custom scheme links are intercepted via React Navigation
  // Linking below and routed to the ThirdParty screen.
  linkProcessingMode: "web-only",
};

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.background);

// Configures React Navigation Linking to intercept custom scheme URLs and send them
// to the ThirdParty screen. Detour handles godetour.link URLs separately via useDetourGate.
function useSchemeLinks(): LinkingOptions<RootStackParamList> {
  return useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: [APP_SCHEME_PREFIX],
      config: {
        screens: {
          ThirdParty: "*",
        },
      },
      async getInitialURL() {
        const url = await Linking.getInitialURL();
        return url && isAppSchemeUrl(url) ? url : null;
      },
      subscribe(listener) {
        const subscription = Linking.addEventListener("url", ({ url }) => {
          if (isAppSchemeUrl(url)) listener(url);
        });
        return () => subscription.remove();
      },
      // Pass the raw URL to ThirdParty so it can display it.
      getStateFromPath(path) {
        const raw = encodeURIComponent(`${APP_SCHEME_PREFIX}${path.replace(/^\//, "")}`);
        return {
          routes: [{ name: "ThirdParty" as const, params: { raw } }],
        };
      },
    }),
    [],
  );
}

// AppContent sits inside NavigationContainer so useDetourGate can call navigationRef.navigate
// after the screen tree is rendered — mirrors expo-router-advanced's useDetourGate placement.
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
  const linking = useSchemeLinks();

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
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
  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <AppRoot />
      </DetourProvider>
    </AuthProvider>
  );
}
