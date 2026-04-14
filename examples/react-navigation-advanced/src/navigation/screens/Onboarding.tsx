import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";

export function Onboarding() {
  const { markOnboardingCompleted } = useAuth();

  // Just flip the flag — Navigation's conditional rendering switches to Tabs automatically.
  const handleGetStarted = () => {
    markOnboardingCompleted();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Test Detour Links</Text>
        <Text style={styles.subtitle}>
          Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
          testing.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Universal / App Link</Text>
        <Text style={styles.bullet}>
          Open a <Text style={styles.accent}>godetour.link</Text> URL in the browser — Detour
          resolves it and navigates to the Details screen.
        </Text>
        <Text style={styles.code}>
          https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details
        </Text>

        <Text style={styles.sectionHeader}>Custom Scheme</Text>
        <Text style={styles.bullet}>
          This example also handles custom scheme links. Opening a non-Detour URL redirects to the
          Third-party screen. Test with the simulator:
        </Text>
        <Text style={styles.code}>
          npx uri-scheme open {`"detour-react-navigation-advanced://app"`} --ios
        </Text>

        <Text style={styles.sectionHeader}>Deferred Link + Auth Gate</Text>
        <Text style={styles.bullet}>
          Copy a Detour link to your clipboard, sign out, then relaunch. The deferred link will
          survive the sign-in flow — once you authenticate,{" "}
          <Text style={styles.accent}>useDetourGate</Text> picks it back up and navigates
          automatically.
        </Text>
        <Text style={styles.bullet}>
          Make sure <Text style={styles.accent}>Copy link feature enabled</Text> is turned on in
          App Configuration in the Detour panel.
        </Text>
      </View>

      <Pressable onPress={handleGetStarted} style={[styles.button, { alignSelf: "stretch", marginTop: 12 }]}>
        <Text style={styles.buttonText}>Get Started →</Text>
      </Pressable>
    </ScrollView>
  );
}
