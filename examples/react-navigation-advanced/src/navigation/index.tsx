import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { colors } from "../styles";
import { TabNavigator } from "./TabNavigator";
import { Details } from "./screens/Details";
import { NotFound } from "./screens/NotFound";
import { Onboarding } from "./screens/Onboarding";
import { SignIn } from "./screens/SignIn";
import { ThirdParty } from "./screens/ThirdParty";

export type RootStackParamList = {
  SignIn: undefined;
  Onboarding: undefined;
  Tabs: undefined;
  Details: {
    fromDeepLink?: string;
    linkType?: string;
    [key: string]: string | undefined;
  } | undefined;
  ThirdParty: { raw?: string } | undefined;
  NotFound: { path?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
};

// Auth flow using conditional screen rendering — equivalent of Stack.Protected in expo-router.
// When isSignedIn or isOnboardingCompleted changes the navigator resets to the first valid screen.
// Returns null until auth is loaded from AsyncStorage so the splash covers the empty state.
export function Navigation() {
  const { isLoaded, isSignedIn, isOnboardingCompleted } = useAuth();

  if (!isLoaded) return null;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isSignedIn ? (
        <Stack.Screen name="SignIn" component={SignIn} />
      ) : !isOnboardingCompleted ? (
        <Stack.Screen name="Onboarding" component={Onboarding} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="Details" component={Details} />
        </>
      )}
      <Stack.Screen name="ThirdParty" component={ThirdParty} />
      <Stack.Screen name="NotFound" component={NotFound} />
    </Stack.Navigator>
  );
}
