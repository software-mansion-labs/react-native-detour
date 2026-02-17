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
  const { isLinkProcessed, linkRoute, linkType, clearLink } =
    useDetourContext();
  const { isSignedIn, setPendingLink } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed) return;

    // No link to process, hide the splash screen and continue as normal.
    if (!linkRoute) {
      SplashScreen.hideAsync();
      return;
    }

    // Custom scheme links are handled by `+native-intent.tsx` and routed to `/third-party`.
    // TODO: Provide opt-in custom scheme links resolving within Detour to ommit returning them to the app for additional handling.
    if (linkType === 'scheme') {
      clearLink();
      SplashScreen.hideAsync();
      return;
    }

    if (!isSignedIn) {
      // For signed-out users, keep the link as pending and continue with auth flow first.
      setPendingLink(linkRoute);
      clearLink();
      SplashScreen.hideAsync();
      router.replace('/sign-in');
      return;
    }

    const path = getPathname(linkRoute);

    if (path !== ALLOWED_ROUTE) {
      // Example gate: only `/details` is accepted in this demo.
      clearLink();
      SplashScreen.hideAsync();
      router.replace('/+not-found');
      return;
    }

    const nextParams = linkType
      ? { fromDeepLink: 'true', linkType }
      : { fromDeepLink: 'true' };

    clearLink();
    SplashScreen.hideAsync();
    router.replace({
      pathname: '/(app)/details',
      params: nextParams,
    });
  }, [
    clearLink,
    isLinkProcessed,
    isSignedIn,
    linkRoute,
    linkType,
    router,
    setPendingLink,
  ]);

  return null;
};
