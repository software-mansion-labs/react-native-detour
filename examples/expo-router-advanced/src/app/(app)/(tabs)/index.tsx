import { Pressable, ScrollView, Text, View } from "react-native";

import { Link } from "expo-router";

import { LinkTestingCard } from "../../../LinkTestingCard";
import { useAuth } from "../../../auth";
import { colors, styles } from "../../../styles";

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinkTestingCard title="Detour Example" />
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
