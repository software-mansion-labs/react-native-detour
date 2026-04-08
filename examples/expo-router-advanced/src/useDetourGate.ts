import { useEffect } from "react";

import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "./auth";

// This hook coordinates incoming Detour links with the app's auth state.
// If the user is not signed in, they are redirected to sign-in while the link
// is preserved in Detour's state. Once isSignedIn flips to true, the effect
// re-fires and completes the navigation — regardless of how many auth steps
// are in between.
export const useDetourGate = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed || !isLoaded) return;

    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    if (!isSignedIn) {
      SplashScreen.hideAsync();
      router.replace("/sign-in");
      return;
    }

    // Only clear the link once we're actually navigating to the destination.
    clearLink();
    SplashScreen.hideAsync();
    router.replace({
      pathname: link.route as any,
      params: { fromDeepLink: "true", linkType: link.type, ...link.params },
    });
  }, [clearLink, isLoaded, isLinkProcessed, isSignedIn, link, router]);
};
