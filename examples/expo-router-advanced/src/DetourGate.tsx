import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useDetourContext } from '@swmansion/react-native-detour';
import { useAuth } from './auth';

const ALLOWED_ROUTE = '/details';

const getPathname = (route: string) => route.split('?')[0] || '/';

// This component acts as a gate for incoming Detour links, coordinating with the auth state and routing logic of the app.
// It should be placed inside the DetourProvider and rendered on all screens (e.g. in the root layout) to ensure that incoming links are handled correctly regardless of the current screen.
export const DetourGate = () => {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const { isSignedIn, setPendingLink, setPendingLinkType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed) return;

    // No link to process, hide the splash screen and continue as normal.
    if (!link) {
      SplashScreen.hideAsync();
      return;
    }

    if (!isSignedIn) {
      // For signed-out users, keep the link as pending and continue with auth flow first.
      setPendingLink(link.route);
      setPendingLinkType(link.type);
      clearLink();
      SplashScreen.hideAsync();
      router.replace('/sign-in');
      return;
    }

    const path = getPathname(link.route);

    if (path !== ALLOWED_ROUTE) {
      // Example gate: only `/details` is accepted in this demo.
      clearLink();
      SplashScreen.hideAsync();
      router.replace('/+not-found');
      return;
    }

    clearLink();
    SplashScreen.hideAsync();
    router.replace({
      pathname: '/(app)/details',
      // Except of link query params the debuging params are passed here to show how link data was processed.
      // You can remove them in production.
      params: { fromDeepLink: 'true', linkType: link.type, ...link.params },
    });
  }, [
    clearLink,
    isLinkProcessed,
    isSignedIn,
    link,
    router,
    setPendingLink,
    setPendingLinkType,
  ]);

  return null;
};
