import { useState } from "react";

import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

import { DarkTheme, NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";

// import { type Config, DetourProvider, useDetourContext } from "@swmansion/react-native-detour";

import { colors } from "./styles";
import { Navigation, type RootStackParamList } from "./navigation";

// const detourConfig: Config = {
//   apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
//   appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
//   shouldUseClipboard: true,
// };

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(colors.background);

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);

  // const { isLinkProcessed, link, clearLink } = useDetourContext();

  // // Handle Detour resolved links.
  // useEffect(() => {
  //   if (!isNavigationReady || !isLinkProcessed || !link) {
  //     return;
  //   }
  //
  //   clearLink();
  //
  //   if (link.pathname === "/details") {
  //     navigationRef.navigate("Details", {
  //       linkParams: link.params,
  //       fromDeepLink: true,
  //       linkType: link.type,
  //     });
  //   } else {
  //     navigationRef.navigate("NotFound", {
  //       path: link.pathname,
  //       params: link.params,
  //     });
  //   }
  // }, [clearLink, isLinkProcessed, isNavigationReady, link, navigationRef]);

  // // Hide the splash screen once the initial link is processed (or determined to be absent).
  // useEffect(() => {
  //   if (isLinkProcessed && isNavigationReady) {
  //     SplashScreen.hideAsync();
  //   }
  // }, [isLinkProcessed, isNavigationReady]);

  if (!isNavigationReady) {
    SplashScreen.hideAsync();
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef} theme={DarkTheme} onReady={() => setNavigationReady(true)}>
        <Navigation />
      </NavigationContainer>
    </>
  );
};

export function App() {
  return (
    // <DetourProvider config={detourConfig}>
    <AppNavigator />
    // </DetourProvider>
  );
}
