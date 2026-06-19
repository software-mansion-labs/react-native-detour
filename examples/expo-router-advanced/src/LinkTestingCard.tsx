import { Platform, Text, View } from "react-native";

import { styles } from "./styles";

type LinkTestingCardProps = {
  title: string;
};

// Shared testing guide rendered by the onboarding screen and every main tab,
// so the instructions stay identical everywhere. The Detour link is shown once
// up top because both the Deferred and Universal / App flows use it.
export function LinkTestingCard({ title }: LinkTestingCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
        testing.
      </Text>

      <View style={styles.divider} />

      <Text style={styles.sectionHeader}>Detour link</Text>
      <Text style={styles.code}>https://&lt;org&gt;.godetour.link/&lt;hash&gt;/(app)/details</Text>

      <Text style={styles.sectionHeader}>Deferred Link</Text>
      <Text style={styles.bullet}>
        Uninstall the app, open a Detour link in the mobile browser, then install and launch. Once
        you authenticate, Detour picks up the pending link and navigates automatically.
      </Text>

      <Text style={styles.sectionHeader}>Universal / App Link</Text>
      <Text style={styles.bullet}>
        With the app installed, trigger the Detour link. You can do it by visiting it in the
        browser, pasting and tapping it in Notes / Messages app or using a terminal command.
      </Text>

      <Text style={styles.sectionHeader}>Custom Scheme</Text>
      <Text style={styles.bullet}>
        A custom-scheme URL launches the app and is also routed through the gate:
      </Text>
      <Text style={styles.code}>
        npx uri-scheme open {`"detour-expo-router-advanced://(app)/details"`}{" "}
        {Platform.OS === "android" ? "--android" : "--ios"}
      </Text>
    </View>
  );
}
