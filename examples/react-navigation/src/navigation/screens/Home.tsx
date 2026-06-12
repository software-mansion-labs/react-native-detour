import { Pressable, ScrollView, Text, View } from "react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors, styles } from "../../styles";
import type { RootStackParamList } from "../index";

export function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Detour Example</Text>
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
        <Text style={styles.code}>https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details</Text>

        <Text style={styles.sectionHeader}>Universal / App Link</Text>
        <Text style={styles.bullet}>
          Open in browser or paste into Notes/Messages and tap — iOS/Android will launch the app and
          Detour navigates to the Details screen.
        </Text>
        <Text style={styles.code}>https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details</Text>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Details")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Open Details manually →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
