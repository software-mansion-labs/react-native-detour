import { useEffect, useRef } from "react";

import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "./auth";

export const useDetourGate = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];

  // Route the gate left for a link destination. clearLink() re-renders before that
  // navigation lands, so the placeholder redirect below must wait for the route to change.
  const linkNavigationFrom = useRef<string | null>(null);

  const route = segments.join("/");
  const isOnSignIn = segments[0] === "sign-in";
  const isInApp = segments[0] === "(app)";
  const isOnOnboarding = isInApp && segments[1] === "onboarding";
  // The root index and (app)/index render an empty view and are only entry points.
  const isOnPlaceholder = segments.length === 0 || (isInApp && segments.length === 1);

  useEffect(() => {
    if (!isLinkProcessed || !isLoaded) return;

    // When a Stack.Protected guard changes, Expo Router moves the user off the guarded
    // screen. Since SDK 58 it does so with a redirect that overrides a navigation made in
    // the same render. After sign-in, wait for that redirect and continue from where it lands.
    if (isSignedIn && isOnSignIn) return;

    SplashScreen.hideAsync();

    // After sign-out the redirect can land on the root index; this effect runs again on
    // that route change and navigates to /sign-in.
    if (!isSignedIn) {
      if (!isOnSignIn) router.replace("/sign-in");
      return;
    }

    // Onboarding must run once before the deep link destination is shown.
    // Keep the link alive so this effect navigates to it after onboarding completes.
    if (!isOnboardingCompleted) {
      if (!isOnOnboarding) router.replace("/(app)/onboarding");
      return;
    }

    if (link) {
      linkNavigationFrom.current = route;
      clearLink();
      router.replace({
        pathname: link.pathname as any,
        params: { fromDeepLink: "true", linkType: link.type, ...link.params },
      });
      return;
    }

    if (linkNavigationFrom.current === route) return;
    linkNavigationFrom.current = null;

    if (isOnPlaceholder) {
      router.replace("/(app)/(tabs)");
    }
  }, [
    clearLink,
    isLinkProcessed,
    isLoaded,
    isOnOnboarding,
    isOnPlaceholder,
    isOnSignIn,
    isOnboardingCompleted,
    isSignedIn,
    link,
    route,
    router,
  ]);
};
