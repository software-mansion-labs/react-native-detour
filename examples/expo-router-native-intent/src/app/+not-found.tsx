import { Text, View } from "react-native";

import { Link, usePathname } from "expo-router";

import { useDetourContext } from "@swmansion/react-native-detour";

import { styles } from "../styles";

export default function NotFoundScreen() {
  const pathname = usePathname();
  const { link } = useDetourContext();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={[styles.description, styles.bold]}>{pathname}</Text>
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
                Detour resolved this link to <Text style={styles.value}>{link.route}</Text>
                {", "}but that path does not match any screen in the app.
              </Text>
            )}
          </>
        )}
        <Link href="/" style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
