import { useEffect } from "react";

import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useAuth } from "./auth";
import type { RootStackParamList } from "./navigation";

// Coordinates incoming Detour links with the app's auth state.
// Mirrors expo-router-advanced's useDetourGate — if the user is not signed in,
// the splash hides and the sign-in screen shows naturally (via conditional rendering
// in Navigation). The link is preserved in Detour's context. Once isSignedIn flips
// to true the effect re-fires and completes the navigation.
export const useDetourGate = (
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  isNavigationReady: boolean,
) => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn, isOnboardingCompleted, markOnboardingCompleted } = useAuth();

  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !isLoaded) return;

    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    if (!isSignedIn) {
      // Link is preserved in Detour context. Sign-in screen shows naturally.
      SplashScreen.hideAsync();
      return;
    }

    // Mark onboarding completed so Navigation doesn't show it before Details.
    if (!isOnboardingCompleted) {
      markOnboardingCompleted();
    }

    clearLink();
    SplashScreen.hideAsync();
    navigationRef.navigate("Details", {
      fromDeepLink: "true",
      linkType: link.type,
      ...link.params,
    });
  }, [isNavigationReady, isLinkProcessed, isLoaded, isSignedIn, link]);
};
