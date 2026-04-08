import { Stack } from "expo-router";

import { colors } from "../../styles";

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

export default function AppLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: "Details" }} />
    </Stack>
  );
}
