import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { styles } from '../src/styles';

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
