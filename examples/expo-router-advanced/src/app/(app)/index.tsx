import { Redirect } from "expo-router";

import { useAuth } from "../../auth";

export default function AppIndex() {
  const { isOnboardingCompleted } = useAuth();

  if (!isOnboardingCompleted) {
    return <Redirect href="/(app)/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)/" />;
}
