import { Pressable, ScrollView, Text, View } from "react-native";

import { Link } from "expo-router";

import { useAuth } from "../../../auth";
import { colors, styles } from "../../../styles";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Settings</Text>
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
            https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/(app)/details
          </Text>

          <Text style={styles.sectionHeader}>Custom Scheme</Text>
          <Text style={styles.bullet}>
            This example also handles custom scheme links alongside Detour. Opening a non-Detour
            URL redirects to the Third-party screen. Test with the simulator:
          </Text>
          <Text style={styles.code}>
            npx uri-scheme open {`"detour-expo-router-advanced://app"`} --ios
          </Text>

          <Text style={styles.sectionHeader}>Deferred Link + Auth Gate</Text>
          <Text style={styles.bullet}>
            Copy a Detour link, sign out, then relaunch. The link survives sign-in —{" "}
            <Text style={styles.accent}>useDetourGate</Text> picks it up once authenticated.
          </Text>
          <Text style={styles.bullet}>
            Make sure <Text style={styles.accent}>Copy link feature enabled</Text> is turned on in
            App Configuration in the Detour panel.
          </Text>
        </View>
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
        <Link href="/(app)/details" asChild style={{ flex: 1 }}>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to Details →</Text>
          </Pressable>
        </Link>
        <Pressable onPress={signOut} style={[styles.button, styles.dangerButton, { flex: 1 }]}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
