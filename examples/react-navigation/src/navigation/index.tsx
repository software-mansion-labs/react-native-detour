import { Image } from "react-native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors } from "../styles";
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

const headerOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

export function Navigation() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Home"
        component={Home}
        options={{
          headerTitle: () => (
            <Image
              source={require("../../assets/detour-logo-transparent.png")}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          ),
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen name="Details" component={Details} />
      <Stack.Screen name="NotFound" component={NotFound} options={{ title: "Not Found" }} />
    </Stack.Navigator>
  );
}
