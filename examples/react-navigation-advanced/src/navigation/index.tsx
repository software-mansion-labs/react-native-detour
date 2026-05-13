import type { LinkingOptions, NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { colors } from "../styles";
import { TabNavigator, type TabParamList } from "./TabNavigator";
import { Details } from "./screens/Details";
import { NotFound } from "./screens/NotFound";
import { Onboarding } from "./screens/Onboarding";
import { SignIn } from "./screens/SignIn";

export type RootStackParamList = {
  SignIn: undefined;
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Details:
    | {
        fromDeepLink?: string;
        linkType?: string;
        [key: string]: string | undefined;
      }
    | undefined;
  NotFound: { path?: string } | undefined;
};

export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>["config"]> = {
  screens: {
    SignIn: "sign-in",
    Onboarding: "onboarding",
    Tabs: {
      screens: {
        Home: "",
        Explore: "explore",
        Settings: "settings",
      },
    },
    Details: "details",
    NotFound: "*",
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};

function renderAuthScreens({
  isSignedIn,
  isOnboardingCompleted,
}: {
  isSignedIn: boolean;
  isOnboardingCompleted: boolean;
}) {
  if (!isSignedIn) {
    return <Stack.Screen name="SignIn" component={SignIn} />;
  }
  if (!isOnboardingCompleted) {
    return <Stack.Screen name="Onboarding" component={Onboarding} />;
  }
  return (
    <>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Details" component={Details} />
    </>
  );
}

// Auth flow using conditional screen rendering — equivalent of Stack.Protected in expo-router.
// When isSignedIn or isOnboardingCompleted changes the navigator resets to the first valid screen.
// Returns null until auth is loaded from AsyncStorage so the splash covers the empty state.
export function Navigation() {
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();

  if (!isLoaded) return null;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {renderAuthScreens({ isSignedIn, isOnboardingCompleted })}
      <Stack.Screen name="NotFound" component={NotFound} />
    </Stack.Navigator>
  );
}
