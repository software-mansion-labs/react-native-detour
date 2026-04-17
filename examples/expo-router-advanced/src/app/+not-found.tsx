import { Text, View } from "react-native";

import { Link, useLocalSearchParams } from "expo-router";

import { useDetourContext } from "@swmansion/react-native-detour";

import { useAuth } from "../auth";
import { styles } from "../styles";

export default function NotFoundScreen() {
  const { isSignedIn } = useAuth();
  const { path } = useLocalSearchParams<{ path?: string }>();
  const backHref = isSignedIn ? "/(app)/(tabs)/" : "/sign-in";
  const { link } = useDetourContext();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={[styles.description, styles.bold]}>{path ?? "Unknown path"}</Text>
        <Text style={styles.description}>The page you are looking for does not exist.</Text>
        {link && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>Resolved Detour link</Text>
            <Text style={styles.label}>
              url: <Text style={styles.value}>{String(link.url)}</Text>
            </Text>
            {link.route && (
              <Text style={styles.subtitle}>
                Detour resolved this link to{" "}
                <Text style={styles.value}>{link.route}</Text>
                {", "}but that path does not match any screen in the app.
              </Text>
            )}
          </>
        )}
        <Link href={backHref} style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
