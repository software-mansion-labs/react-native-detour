import { Text, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { styles } from '../src/styles';

export default function NotFoundScreen() {
  const pathname = usePathname();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={[styles.description, styles.bold]}>{pathname}</Text>
        <Text style={styles.description}>
          The page you are looking for does not exist.
        </Text>

        <Link href="/" style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
