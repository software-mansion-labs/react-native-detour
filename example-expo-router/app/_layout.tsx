import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  DetourProvider,
  useDetourContext,
  type Config,
} from '@swmansion/react-native-detour';
import { AuthProvider, useAuth } from '../src/auth';

const detourConfig: Config = {
  API_KEY: 'API_KEY_PLACEHOLDER',
  appID: 'APP_ID_PLACEHOLDER',
  shouldUseClipboard: true,
};

const AuthGate = () => {
  const { isSignedIn, lastHandledRoute, setLastHandledRoute } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (lastHandledRoute) {
      const handledPath = lastHandledRoute.split('?')[0] || '/';
      if (pathname === handledPath) {
        setLastHandledRoute(null);
      }
      return;
    }
    if (isSignedIn && pathname === '/') {
      router.replace('/home');
      return;
    }
    if (!isSignedIn && pathname !== '/') {
      router.replace('/');
    }
  }, [isSignedIn, lastHandledRoute, pathname, router, setLastHandledRoute]);

  return null;
};

const DetourGate = () => {
  const {
    isSignedIn,
    isUnlocked,
    pendingRoute,
    setPendingRoute,
    clearPendingRoute,
    setLastHandledRoute,
  } = useAuth();
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();
  const router = useRouter();
  const canHandleLink = isSignedIn && isUnlocked;

  useEffect(() => {
    if (!isLinkProcessed || !linkRoute) return;

    if (canHandleLink) {
      setLastHandledRoute(linkRoute);
      router.replace(linkRoute);
      clearLink();
      return;
    }

    if (pendingRoute !== linkRoute) {
      setPendingRoute(linkRoute);
    }
    clearLink();
  }, [
    canHandleLink,
    clearLink,
    isLinkProcessed,
    linkRoute,
    pendingRoute,
    router,
    setPendingRoute,
    setLastHandledRoute,
  ]);

  useEffect(() => {
    if (!pendingRoute || !canHandleLink) return;

    setLastHandledRoute(pendingRoute);
    router.replace(pendingRoute);
    clearPendingRoute();
  }, [
    canHandleLink,
    clearPendingRoute,
    pendingRoute,
    router,
    setLastHandledRoute,
  ]);

  return null;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <DetourProvider config={detourConfig}>
        <AuthGate />
        <DetourGate />
        <Stack />
      </DetourProvider>
    </AuthProvider>
  );
}
