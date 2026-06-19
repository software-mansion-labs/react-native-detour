import { Pressable, ScrollView, Text, View } from "react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { LinkTestingCard } from "../../LinkTestingCard";
import { useAuth } from "../../auth";
import { colors, styles } from "../../styles";
import type { RootStackParamList } from "../index";

export function Settings() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinkTestingCard title="Settings" />
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
        <Pressable
          onPress={() => navigation.navigate("Details")}
          style={[styles.button, { flex: 1 }]}
        >
          <Text style={styles.buttonText}>Go to Details →</Text>
        </Pressable>
        <Pressable onPress={signOut} style={[styles.button, styles.dangerButton, { flex: 1 }]}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
