import { useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "./auth";

export const useDetourGate = (): { appGuard: boolean; signInGuard: boolean } => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Guards the "normal startup" branch so it only fires once per sign-in
  // session. Set to true after any successful navigation; reset on sign-out.
  const initialNavigationFired = useRef(false);

  // Controls when Stack.Protected guards activate. Stays false until the
  // effect below has queued the first navigation. On cold start this keeps
  // both guards off while the splash screen is visible; once the effect
  // decides where to navigate it unlocks them.
  const [guardsUnlocked, setGuardsUnlocked] = useState(false);

  useEffect(() => {
    if (!isLinkProcessed || !isLoaded) return;

    if (!isSignedIn) {
      initialNavigationFired.current = false;
      setGuardsUnlocked(true);
      SplashScreen.hideAsync();
      // Stack.Protected shows sign-in when signInGuard becomes true.
      // Only push a replace if we're on a different screen (e.g. root index
      // from a deep link that returned "").
      if (pathnameRef.current !== "/sign-in") {
        router.replace("/sign-in");
      }
      return;
    }

    // ── Signed in ──

    if (link) {
      initialNavigationFired.current = true;
      const route = link.route;
      const type = link.type;
      const params = link.params ?? {};

      // Onboarding must run before the deep link destination is shown.
      // The link stays in context (not cleared) so this branch re-fires
      // after onboarding completes.
      if (!isOnboardingCompleted) {
        router.replace("/(app)/onboarding");
        setGuardsUnlocked(true);
        SplashScreen.hideAsync();
        return;
      }

      clearLink();
      // Queue navigation THEN unlock guards. React 18 batches both updates
      // so the (app) group mounts with the replace already pending —
      // the blank (app)/index is never painted.
      router.replace({
        pathname: route as any,
        params: { fromDeepLink: "true", linkType: type, ...params },
      });
      setGuardsUnlocked(true);
      SplashScreen.hideAsync();
      return;
    }

    if (initialNavigationFired.current) {
      setGuardsUnlocked(true);
      return;
    }
    initialNavigationFired.current = true;

    // If +native-intent.tsx already navigated to a non-default, non-auth route
    // (e.g. /third-party for custom scheme links), don't override it.
    // Exclude /sign-in so signing in always triggers a navigation to (app).
    const current = pathnameRef.current;
    if (current && current !== "/" && current !== "" && current !== "/sign-in") {
      setGuardsUnlocked(true);
      SplashScreen.hideAsync();
      return;
    }

    if (!isOnboardingCompleted) {
      router.replace("/(app)/onboarding");
    } else {
      router.replace("/(app)/(tabs)");
    }
    setGuardsUnlocked(true);
    SplashScreen.hideAsync();
  }, [clearLink, isLoaded, isLinkProcessed, isOnboardingCompleted, isSignedIn, link, router]);

  return {
    appGuard: guardsUnlocked && isLoaded && isSignedIn,
    signInGuard: guardsUnlocked && isLoaded && !isSignedIn,
  };
};
