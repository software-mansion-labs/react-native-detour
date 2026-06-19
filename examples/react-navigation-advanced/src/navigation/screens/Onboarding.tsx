import { Pressable, ScrollView, Text } from "react-native";

import { LinkTestingCard } from "../../LinkTestingCard";
import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";

export function Onboarding() {
  const { markOnboardingCompleted } = useAuth();

  // Just flip the flag — Navigation's conditional rendering switches to Tabs automatically.
  const handleGetStarted = () => {
    markOnboardingCompleted();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <LinkTestingCard title="Test Detour Links" />

      <Pressable
        onPress={handleGetStarted}
        style={[styles.button, { alignSelf: "stretch", marginTop: 12 }]}
      >
        <Text style={styles.buttonText}>Get Started →</Text>
      </Pressable>
    </ScrollView>
  );
}
