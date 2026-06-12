import { Pressable, ScrollView, Text, View } from "react-native";

import { useRouter } from "expo-router";

import { useDetourContext } from "@swmansion/react-native-detour";

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
      <View style={styles.card}>
        <Text style={styles.title}>Test Detour Links</Text>
        <Text style={styles.subtitle}>
          Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
          testing.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Deferred Link + Auth Gate</Text>
        <Text style={styles.bullet}>
          Uninstall the app, open a Detour link in the mobile browser, then install and launch. Once
          you authenticate, <Text style={styles.accent}>useDetourGate</Text> picks up the pending
          link and navigates automatically.
        </Text>
        <Text style={styles.bullet}>
          To test just the auth-gate without reinstalling: copy the link, sign out, then relaunch.
        </Text>

        <Text style={styles.sectionHeader}>Universal / App Link</Text>
        <Text style={styles.bullet}>
          Open a <Text style={styles.accent}>godetour.link</Text> URL in the browser or paste into
          Notes/Messages and tap — Detour resolves it and navigates to the Details screen.
        </Text>
        <Text style={styles.code}>
          https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/(app)/details
        </Text>

        <Text style={styles.sectionHeader}>Custom Scheme</Text>
        <Text style={styles.bullet}>
          This example also handles custom scheme links alongside Detour. Opening a non-Detour URL
          redirects to the Third-party screen. Test with the simulator:
        </Text>
        <Text style={styles.code}>
          npx uri-scheme open {`"detour-expo-router-advanced://app"`} --ios
        </Text>
      </View>

      <Pressable
        onPress={handleGetStarted}
        style={[styles.button, { alignSelf: "stretch", marginTop: 12 }]}
      >
        <Text style={styles.buttonText}>Get Started →</Text>
      </Pressable>
    </ScrollView>
  );
}
