import { useEffect } from "react";

import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useAuth } from "./auth";
import type { RootStackParamList } from "./navigation";

// Coordinates incoming Detour links with the app's auth state.
// Navigation's conditional rendering handles all auth-based screen routing
// (SignIn → Onboarding → Tabs). This hook only drives two things:
//   1. Hiding the splash screen once auth and link processing are ready.
//   2. Navigating to the Details screen when a resolved link is available.
//
// Flow:
//   not loaded / nav not ready       → wait
//   not signed in                    → hide splash (Navigation shows SignIn)
//   signed in + link + no onboarding → hide splash, keep link alive
//                                      (Navigation shows Onboarding; re-fires after it's done)
//   signed in + link + onboarded     → clearLink, navigate to Details
//   signed in + no link              → hide splash (Navigation shows correct screen)
export const useDetourGate = (
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  isNavigationReady: boolean,
) => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();

  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !isLoaded) return;

    if (!isSignedIn) {
      SplashScreen.hideAsync();
      return;
    }

    if (link) {
      // Onboarding must run once before the deep link destination is shown.
      // Keep the link alive so this branch re-fires after onboarding completes.
      if (!isOnboardingCompleted) {
        SplashScreen.hideAsync();
        return;
      }

      clearLink();
      SplashScreen.hideAsync();
      navigationRef.navigate("Details", {
        fromDeepLink: "true",
        linkType: link.type,
        ...link.params,
      });
      return;
    }

    // No link: hide splash, Navigation shows the correct screen via conditional rendering.
    SplashScreen.hideAsync();
  }, [isNavigationReady, isLinkProcessed, isLoaded, isSignedIn, isOnboardingCompleted, link, clearLink, navigationRef]);
};
