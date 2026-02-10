import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  DetourProvider,
  useDetourContext,
  type Config,
} from '@swmansion/react-native-detour';
import { AuthProvider, useAuth } from '../src/auth';

const detourConfig: Config = {
  API_KEY: 'cf188707ea5222df17aca6352d56a6eedbe7e9e684ffab3df63df45c41de2b50',
  appID: '87d095f0-ae75-45b0-808f-8a5dfea599cd',
  shouldUseClipboard: true,
};

// Orchestrates a gated flow:
// 1) capture Detour links
// 2) defer them until sign-in + unlock
// 3) keep entry routes aligned with auth state
const DetourGate = () => {
  const {
    isSignedIn,
    isUnlocked,
    pendingRoute,
    setPendingRoute,
    clearPendingRoute,
  } = useAuth();
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();
  const router = useRouter();
  const pathname = usePathname();
  const canHandleLink = isSignedIn && isUnlocked;
  const entryRoute = isSignedIn ? '/home' : '/';

  const normalizePath = (route: string) => route.split('?')[0] || '/';

  useEffect(() => {
    if (!isLinkProcessed) return;

    // 1) A new Detour link arrived.
    if (linkRoute) {
      if (canHandleLink) {
        const targetPath = normalizePath(linkRoute);
        if (pathname !== targetPath) {
          router.replace(linkRoute);
          return;
        }
        clearLink();
        return;
      }

      if (pendingRoute !== linkRoute) {
        setPendingRoute(linkRoute);
      }
      clearLink();
      if (pathname !== entryRoute) {
        router.replace(entryRoute);
      }
      return;
    }

    // 2) User just became eligible to handle the pending link.
    if (pendingRoute && canHandleLink) {
      const targetPath = normalizePath(pendingRoute);
      if (pathname !== targetPath) {
        router.replace(pendingRoute);
        return;
      }
      clearPendingRoute();
    }
  }, [
    canHandleLink,
    clearLink,
    clearPendingRoute,
    entryRoute,
    isLinkProcessed,
    linkRoute,
    pathname,
    pendingRoute,
    router,
    setPendingRoute,
  ]);

  useEffect(() => {
    if (!isLinkProcessed) return;
    if (linkRoute || pendingRoute) return;

    // 3) Keep entry routes aligned with auth state.
    if (isSignedIn && pathname === '/') {
      router.replace('/home');
      return;
    }
    if (!isSignedIn && pathname !== '/') {
      router.replace('/');
    }
  }, [isLinkProcessed, isSignedIn, linkRoute, pathname, pendingRoute, router]);

  return null;
};

const AppStack = () => {
  const { isLinkProcessed } = useDetourContext();

  if (!isLinkProcessed) {
    return null;
  }

  return <Stack />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <DetourGate />
        <AppStack />
      </DetourProvider>
    </AuthProvider>
  );
}
