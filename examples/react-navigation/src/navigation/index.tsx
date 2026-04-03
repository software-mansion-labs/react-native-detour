import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Details } from "./screens/Details";
import { Home } from "./screens/Home";
import { NotFound } from "./screens/NotFound";

export type RootStackParamList = {
  Home: undefined;
  Details:
    | {
        fromDeepLink?: boolean;
        linkType?: string;
        linkParams?: Record<string, string>;
      }
    | undefined;
  NotFound: { path?: string; params?: Record<string, string> } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Details" component={Details} />
      <Stack.Screen name="NotFound" component={NotFound} options={{ title: "Page Not Found" }} />
    </Stack.Navigator>
  );
}
