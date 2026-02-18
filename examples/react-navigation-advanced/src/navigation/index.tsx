import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from './screens/Home';
import { Details } from './screens/Details';
import { Login } from './screens/Login';
import { useAuth } from '../AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Details:
    | {
        id?: string;
        // Indicates whether the screen was opened via deep link or button navigation for testing purposes.
        fromDeepLink?: boolean;
        source?: 'detour' | 'linking';
      }
    | undefined;
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
    </Stack.Navigator>
  );
}
