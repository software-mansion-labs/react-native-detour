import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useDetourContext } from '@swmansion/react-native-detour';
import { useAuth } from './auth';

const ALLOWED_ROUTE = '/details';

const getPathname = (route: string) => route.split('?')[0] || '/';

// This hook acts as a gate for incoming Detour links, coordinating with the auth state and routing logic of the app.
// It should be called inside a component rendered on all screens (e.g. in the root layout) to ensure that incoming links are handled correctly regardless of the current screen.
export const useDetourGate = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed) return;

    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    const path = getPathname(link.route);

    if (path !== ALLOWED_ROUTE) {
      // Example gate: only `/details` is accepted in this demo.
      clearLink();
      SplashScreen.hideAsync();
      router.replace({
        pathname: '/+not-found',
        params: { path: link.route },
      });
      return;
    }

    if (!isSignedIn) {
      // For signed-out users, redirect to sign-in but leave the link in Detour's state.
      // The effect will re-fire when auth completes (isSignedIn flips to true), regardless
      // of how many onboarding steps are in between, and complete the navigation then.
      SplashScreen.hideAsync();
      router.replace('/sign-in');
      return;
    }

    // Only clear the link once we're actually navigating to the destination.
    clearLink();
    router.replace({
      pathname: '/(app)/details',
      // Except of link query params the debugging params are passed here to show how link data was processed.
      // You can remove them in production.
      params: { fromDeepLink: 'true', linkType: link.type, ...link.params },
    });
  }, [clearLink, isLinkProcessed, isSignedIn, link, router]);
};
