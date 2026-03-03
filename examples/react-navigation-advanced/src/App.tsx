import { useEffect, useMemo, useState } from 'react';
import {
  NavigationContainer,
  getStateFromPath as defaultGetStateFromPath,
  useNavigationContainerRef,
  type LinkingOptions,
  type NavigationContainerRefWithCurrent,
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
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
  // HTTP(S) links are handled by Detour; custom scheme links are handled by
  // React Navigation Linking (see useAppLinking below). Set to `'all'` or omit
  // (it's the default) if you also want Detour to handle scheme links.
  // 'web-only' keeps the runtime Universal/App link listener active so the SDK
  // handles both runtime and initial Universal/App links — necessary because
  // React Navigation Linking is configured to ignore non-scheme URLs.
  linkProcessingMode: 'web-only',
};

SplashScreen.preventAutoHideAsync();

function useAppLinking(
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>
): LinkingOptions<RootStackParamList> {
  const { isLoggedIn, setPendingRoute } = useAuth();

  return useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: [APP_SCHEME_PREFIX],
      config: {
        screens: {
          Login: 'login',
          Home: '',
          Details: 'details',
          NotFound: '*',
        },
      },
      // Intercept the initial URL when the app is launched via a custom scheme link while
      // signed out to store a pending route and avoid dispatching an unhandled navigation action.
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
            // Known protected route: save for after login, stay on Login screen.
            setPendingRoute(pending);
            return null;
          }
          // Unknown path: pass through so React Navigation Linking shows NotFound.
          return initialUrl;
        }

        return initialUrl;
      },
      // Intercept runtime scheme links when signed out to store a pending route and
      // avoid dispatching an unhandled navigation action.
      subscribe(listener) {
        const subscription = Linking.addEventListener('url', ({ url }) => {
          if (!isAppSchemeUrl(url)) {
            return;
          }

          const pending = toPendingDetailsRoute(url, 'linking');
          if (!isLoggedIn && pending) {
            // Known protected route: save for after login and redirect to Login.
            setPendingRoute(pending);
            if (navigationRef.isReady()) {
              navigationRef.navigate('Login');
            }
            return;
          }

          // Logged-in (any path) or not-logged-in with unknown path: delegate to
          // React Navigation Linking — getStateFromPath injects params as needed.
          listener(url);
        });

        return () => {
          subscription.remove();
        };
      },
      // For testing purposes, inject a param to indicate when the Details screen is opened via a custom scheme link (not Detour, not a button).
      getStateFromPath(path, options) {
        const state = defaultGetStateFromPath(path, options);
        if (!state) return state;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return {
          ...state,
          routes: state.routes.map((route) => {
            if (route.name === 'Details') {
              return {
                ...route,
                params: {
                  ...route.params,
                  fromDeepLink: true,
                  source: 'linking' as const,
                },
              };
            }
            if (route.name === 'NotFound') {
              return { ...route, params: { path: normalizedPath } };
            }
            return route;
          }),
        };
      },
    }),
    [isLoggedIn, navigationRef, setPendingRoute]
  );
}

// The main app content is rendered in this component which is nested inside the DetourProvider.
// This allows the app to wait to render any navigation content until Detour has processed the initial link and determined whether to navigate or show the splash screen.
const AppRoot = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isNavigationReady, setNavigationReady] = useState(false);
  const { isLoggedIn, pendingRoute, setPendingRoute, clearPendingRoute } =
    useAuth();
  const { isLinkProcessed, link, clearLink } = useDetourContext();

  const linking = useAppLinking(navigationRef);

  // Handle Detour resolved links.
  useEffect(() => {
    if (!isNavigationReady || !isLinkProcessed || !link) {
      return;
    }

    // toPendingDetailsRoute returns null for unrecognized paths, which allows us to show a NotFound screen for those while still handling known routes (e.g. /details/:id) that require authentication by saving a pending route if the user is not logged in.
    const pending = toPendingDetailsRoute(link.route, 'detour');
    clearLink();

    if (!pending) {
      navigationRef.navigate('NotFound', {
        path: link.pathname,
        params: link.params,
      });
      return;
    }

    // If the user is not logged in, save the pending route and navigate to Login. Otherwise, navigate to the resolved route.
    if (!isLoggedIn) {
      setPendingRoute({
        ...pending,
        params: {
          ...pending.params,
          linkType: link.type,
          linkParams: link.params,
        },
      });
      navigationRef.navigate('Login');
      return;
    }
    navigationRef.navigate(pending.name, {
      ...pending.params,
      linkType: link.type,
      linkParams: link.params,
    });
  }, [
    clearLink,
    isLinkProcessed,
    isLoggedIn,
    isNavigationReady,
    link,
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
        <AppRoot />
      </AuthProvider>
    </DetourProvider>
  );
}
