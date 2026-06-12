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
          Uninstall the app, open a Detour link in the mobile browser, then install and launch. Sign
          in and complete onboarding — React Navigation replays the link once{" "}
          <Text style={styles.accent}>Details</Text> becomes reachable.
        </Text>
        <Text style={styles.bullet}>
          To test just the auth-gate without reinstalling: copy the link, sign out, then relaunch.
        </Text>

        <Text style={styles.sectionHeader}>Universal / App Link</Text>
        <Text style={styles.bullet}>
          Open a <Text style={styles.accent}>godetour.link</Text> URL in the browser or paste into
          Notes/Messages and tap — Detour resolves it and navigates to the Details screen.
        </Text>
        <Text style={styles.code}>https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details</Text>

        <Text style={styles.sectionHeader}>Custom Scheme</Text>
        <Text style={styles.bullet}>
          This example also handles custom scheme links. Opening a non-Detour URL redirects to the
          Third-party screen. Test with the simulator:
        </Text>
        <Text style={styles.code}>
          npx uri-scheme open {`"detour-react-navigation-advanced://app"`} --ios
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
