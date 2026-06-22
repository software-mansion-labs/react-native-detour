import { Pressable, ScrollView, Text } from "react-native";

import { useRouter } from "expo-router";

import { useDetourContext } from "@swmansion/react-native-detour";

import { LinkTestingCard } from "../../LinkTestingCard";
import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";

export default function OnboardingScreen() {
  const { markOnboardingCompleted } = useAuth();
  const { link } = useDetourContext();
  const router = useRouter();

  const handleGetStarted = () => {
    markOnboardingCompleted();
    // When a deferred link is pending, useDetourGate navigates to the link
    // destination once isOnboardingCompleted flips — don't navigate here too.
    if (!link) {
      router.replace("/(app)/(tabs)");
    }
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
