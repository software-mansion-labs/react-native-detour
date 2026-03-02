import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from './screens/Home';
import { Details } from './screens/Details';

export type RootStackParamList = {
  Home: undefined;
  Details: { fromDeepLink?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Details" component={Details} />
    </Stack.Navigator>
  );
}
