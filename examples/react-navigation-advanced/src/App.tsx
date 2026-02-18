import { useEffect, useMemo, useState } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
  type LinkingOptions,
} from '@react-navigation/native';
import { Linking } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  DetourProvider,
  type Config,
  useDetourContext,
} from '@swmansion/react-native-detour';
import { AuthProvider, useAuth } from './AuthContext';
import { Navigation, type RootStackParamList } from './navigation';
import {
  APP_SCHEME_PREFIX,
  isAppSchemeUrl,
  toPendingDetailsRoute,
} from './navigation/helpers';

const detourConfig: Config = {
  API_KEY: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  // In this example, HTTP(S) links are handled by Detour,
  // while custom scheme links are handled by React Navigation linking to demonstrate coexistence of both approaches.
  // You can easily migrate custom scheme handling to Detour by enabling `handleSchemeLinks: true`
  // and using a central `useDetourContext` route mapping. Then you can remove the extra
  // `getInitialURL` / `subscribe` interception below.
  handleSchemeLinks: false,
};

SplashScreen.preventAutoHideAsync();

const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);
  const { isLoggedIn, pendingRoute, setPendingRoute, clearPendingRoute } =
    useAuth();
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();

  const linking = useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: [APP_SCHEME_PREFIX],
      config: {
        screens: {
          Login: 'login',
          Home: '',
          Details: 'details/:id?',
        },
      },
      // Intercept scheme links when signed out to keep pending+resume flow
      // without dispatching an unhandled navigation action.
      // This is needed only because scheme links are handled by React Navigation in this example.
      async getInitialURL() {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl) {
          return null;
        }

        if (!isAppSchemeUrl(initialUrl)) {
          return null;
        }

        const pending = toPendingDetailsRoute(initialUrl, 'linking');
        if (!isLoggedIn) {
          if (pending) {
            setPendingRoute(pending);
          }
          return null;
        }

        return initialUrl;
      },
      subscribe(listener) {
        const subscription = Linking.addEventListener('url', ({ url }) => {
          if (!isAppSchemeUrl(url)) {
            return;
          }

          const pending = toPendingDetailsRoute(url, 'linking');
          if (!isLoggedIn) {
            if (pending) {
              setPendingRoute(pending);
            }
            if (navigationRef.isReady()) {
              navigationRef.navigate('Login');
            }
            return;
          }

          listener(url);
        });

        return () => {
          subscription.remove();
        };
      },
    }),
    [isLoggedIn, navigationRef, setPendingRoute]
  );

  // Handle Detour resolved links.
  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !linkRoute) {
      return;
    }

    const pending = toPendingDetailsRoute(linkRoute, 'detour');
    clearLink();

    if (!pending) {
      return;
    }

    if (!isLoggedIn) {
      setPendingRoute(pending);
      navigationRef.navigate('Login');
      return;
    }

    navigationRef.navigate(pending.name, pending.params);
  }, [
    clearLink,
    isLinkProcessed,
    isLoggedIn,
    isNavigationReady,
    linkRoute,
    navigationRef,
    setPendingRoute,
  ]);

  // Handle pending route after login.
  useEffect(() => {
    if (
      !isNavigationReady ||
      !isLinkProcessed ||
      !isLoggedIn ||
      !pendingRoute
    ) {
      return;
    }

    navigationRef.navigate(pendingRoute.name, pendingRoute.params);
    clearPendingRoute();
  }, [
    clearPendingRoute,
    isLinkProcessed,
    isLoggedIn,
    isNavigationReady,
    navigationRef,
    pendingRoute,
  ]);

  // Hide the splash screen once the initial URL is processed and navigation is ready.
  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed) {
      return;
    }

    SplashScreen.hideAsync();
  }, [isLinkProcessed, isNavigationReady]);

  if (!isLinkProcessed) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => setNavigationReady(true)}
    >
      <Navigation />
    </NavigationContainer>
  );
};

export function App() {
  return (
    <DetourProvider config={detourConfig}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </DetourProvider>
  );
}
