import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from './screens/Home';
import { Details } from './screens/Details';
import { Login } from './screens/Login';
import { NotFound } from './screens/NotFound';
import { useAuth } from '../AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Details:
    | {
        // Indicates whether the screen was opened via deep link or button navigation for testing purposes.
        fromDeepLink?: boolean;
        source?: 'detour' | 'linking';
        linkType?: string;
        linkParams?: Record<string, string>;
      }
    | undefined;
  NotFound: { path?: string; params?: Record<string, string> } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth flow using conditional screen rendering.
export function Navigation() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator>
      {!isLoggedIn ? (
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ title: 'Sign In' }}
        />
      ) : (
        <>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Details" component={Details} />
        </>
      )}
      <Stack.Screen
        name="NotFound"
        component={NotFound}
        options={{ title: 'Page Not Found' }}
        navigationKey={isLoggedIn ? 'authenticated' : 'unauthenticated'}
      />
    </Stack.Navigator>
  );
}
