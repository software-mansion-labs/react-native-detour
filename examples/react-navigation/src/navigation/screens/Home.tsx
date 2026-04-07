import { Pressable, ScrollView, Text, View } from "react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { styles } from "../../styles";
import type { RootStackParamList } from "../index";

export function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Detour Example</Text>
        <Text style={styles.subtitle}>
          Add credentials from the Detour panel to <Text style={styles.accent}>.env</Text> before
          testing.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>Universal / App Link</Text>
        <Text style={styles.bullet}>
          Open a Detour link in the browser — iOS/Android will launch the app and Detour will
          navigate to the Details screen. Test with the simulator using:
        </Text>
        <Text style={styles.code}>
          npx uri-scheme open {`"detour-react-navigation://details"`} --ios
        </Text>

        <Text style={styles.sectionHeader}>Deferred Link</Text>
        <Text style={styles.bullet}>
          Copy a Detour link to your clipboard, then kill and relaunch the app. Because{" "}
          <Text style={styles.accent}>shouldUseClipboard</Text> is enabled, Detour reads the
          clipboard on startup and resolves the pending link automatically.
        </Text>
        <Text style={styles.code}>
          https://&lt;your-org&gt;.godetour.link/&lt;hash&gt;/details
        </Text>

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
