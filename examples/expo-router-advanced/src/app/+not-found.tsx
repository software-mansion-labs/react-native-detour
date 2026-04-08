import { Text, View } from "react-native";

import { Link, useLocalSearchParams } from "expo-router";

import { useAuth } from "../auth";
import { styles } from "../styles";

export default function NotFoundScreen() {
  const { isSignedIn } = useAuth();
  const { path } = useLocalSearchParams<{ path?: string }>();
  const backHref = isSignedIn ? "/(app)/(tabs)/" : "/sign-in";

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={[styles.description, styles.bold]}>{path ?? "Unknown path"}</Text>
        <Text style={styles.description}>The page you are looking for does not exist.</Text>
        <Link href={backHref} style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
