import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from './screens/Home';
import { Details } from './screens/Details';
import { Login } from './screens/Login';
import { useAuth } from '../AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Details: { fromDeepLink?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// The root stack navigator is used for the authentication flow and the main app flow.
export function Navigation() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: !isLoggedIn }}>
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
