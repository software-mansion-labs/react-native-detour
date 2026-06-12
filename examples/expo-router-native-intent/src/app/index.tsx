import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Link } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, styles } from "../styles";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[headerStyles.header, { paddingTop: insets.top }]}>
        <Image
          source={require("../../assets/detour-logo-transparent.png")}
          style={{ width: 32, height: 32 }}
          resizeMode="contain"
        />
      </View>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Detour Native Intent Example</Text>
          <Text style={styles.subtitle}>
            Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
            testing.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Deferred Link</Text>
          <Text style={styles.bullet}>
            Uninstall the app or clear its data, open a Detour link in the mobile browser, then
            install and launch — the SDK resolves the link automatically.
          </Text>
          <Text style={styles.code}>
            https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details
          </Text>

          <Text style={styles.sectionHeader}>Universal / App Link</Text>
          <Text style={styles.bullet}>
            Open a <Text style={styles.accent}>godetour.link</Text> URL in the browser or paste into
            Notes/Messages and tap — Detour resolves it in{" "}
            <Text style={styles.accent}>+native-intent</Text> and routes directly to the target
            screen.
          </Text>
          <Text style={styles.code}>
            https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details
          </Text>

          <View style={styles.divider} />

          <Link href="/details" style={styles.linkButton}>
            Open /details manually →
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
