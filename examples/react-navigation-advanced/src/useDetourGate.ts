import { useEffect } from "react";

import * as SplashScreen from "expo-splash-screen";

import { useAuth } from "./auth";

// Coordinates auth/onboarding gating with the React Navigation linking bridge.
// It keeps splash handling in one place and returns when deep-link navigation
// is allowed to proceed.
export const useDetourGate = (isNavigationReady: boolean) => {
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();
  const canHandleDetourLink = isLoaded && isSignedIn && isOnboardingCompleted;

  useEffect(() => {
    if (!isNavigationReady || !isLoaded) return;
    SplashScreen.hideAsync();
  }, [isNavigationReady, isLoaded]);

  return { canHandleDetourLink };
};
