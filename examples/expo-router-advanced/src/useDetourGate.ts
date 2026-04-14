import { useEffect, useRef } from "react";

import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "./auth";

export const useDetourGate = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();
  const router = useRouter();

  // Guards the "normal startup" branch so it only fires once per sign-in
  // session. Set to true after any successful navigation; reset on sign-out.
  const initialNavigationFired = useRef(false);

  useEffect(() => {
    if (!isLinkProcessed || !isLoaded) return;

    if (!isSignedIn) {
      SplashScreen.hideAsync();
      initialNavigationFired.current = false;
      router.replace("/sign-in");
      return;
    }

    if (link) {
      initialNavigationFired.current = true;

      // Onboarding must run once before the deep link destination is shown.
      // Keep the link alive so this branch re-fires after onboarding completes.
      if (!isOnboardingCompleted) {
        SplashScreen.hideAsync();
        router.replace("/(app)/onboarding");
        return;
      }

      // Onboarding done — navigate to the link destination.
      // Mark before clearLink so the re-fire caused by link→null is skipped.
      clearLink();
      SplashScreen.hideAsync();
      router.replace({
        pathname: link.route as any,
        params: { fromDeepLink: "true", linkType: link.type, ...link.params },
      });
      return;
    }

    if (initialNavigationFired.current) return;
    initialNavigationFired.current = true;

    SplashScreen.hideAsync();
    if (!isOnboardingCompleted) {
      router.replace("/(app)/onboarding");
    } else {
      router.replace("/(app)/(tabs)");
    }
  }, [clearLink, isLoaded, isLinkProcessed, isOnboardingCompleted, isSignedIn, link, router]);
};
