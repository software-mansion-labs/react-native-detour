import { useEffect } from "react";

import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "./auth";

const DETOUR_SCHEME = "detour-react-navigation-advanced://";

const toNavigationUrl = (route: string, linkType: string) => {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  const [pathname = "/", ...searchParts] = normalizedRoute.split("?");
  const search = searchParts.join("?");
  const params = new URLSearchParams(search);

  params.append("fromDeepLink", "true");
  params.append("linkType", linkType);

  const query = params.toString();
  const path = pathname.replace(/^\//, "");
  return `${DETOUR_SCHEME}${path}${query ? `?${query}` : ""}`;
};

// Coordinates incoming Detour links with the app's auth state.
// Navigation's conditional rendering handles all auth-based screen routing
// (SignIn → Onboarding → Tabs). This hook only drives two things:
//   1. Hiding the splash screen once auth and link processing are ready.
//   2. Forwarding the link URL to React Navigation once signed in and onboarded.
//
// Flow:
//   not loaded / nav not ready       → wait
//   not signed in                    → hide splash (Navigation shows SignIn)
//   signed in + link + no onboarding → hide splash, keep link alive
//                                      (Navigation shows Onboarding; re-fires after it's done)
//   signed in + link + onboarded     → clearLink, forward URL to React Navigation linking
//   signed in + no link              → hide splash (Navigation shows correct screen)
export const useDetourGate = (
  isNavigationReady: boolean,
  handleDetourLink: (url: string) => void,
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
      handleDetourLink(toNavigationUrl(link.route, link.type));
      SplashScreen.hideAsync();
      return;
    }

    // No link: hide splash, Navigation shows the correct screen via conditional rendering.
    SplashScreen.hideAsync();
  }, [
    isNavigationReady,
    isLinkProcessed,
    isLoaded,
    isSignedIn,
    isOnboardingCompleted,
    link,
    clearLink,
    handleDetourLink,
  ]);
};
