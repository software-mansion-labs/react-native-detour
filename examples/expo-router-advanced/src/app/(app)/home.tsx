import { Pressable, Text, View } from "react-native";

import { Link, useRouter } from "expo-router";

import { useAuth } from "../../auth";
import { styles } from "../../styles";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.label}>Open a Detour link to test deferred routing after sign in.</Text>
        <Text style={styles.instructions}>
          A Detour link that resolves to <Text style={styles.bold}>/details</Text> should
          immidiately redirect there after sign in.
        </Text>
        <Text style={styles.instructions}>
          This app also handles custom scheme links to demonstrate coexistence of Detour with custom
          native intent logic. Try opening a link with the scheme{" "}
          <Text style={styles.bold}>detour-expo-router-advanced://app</Text> to see it in action.
        </Text>
        <Text style={styles.instructions}>
          Links resolving to any other route should end on Not Found after sign in.
        </Text>
        <Link href="/(app)/details" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to Details</Text>
          </Pressable>
        </Link>
        <Pressable onPress={handleLogout} style={[styles.button, styles.dangerButton]}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
