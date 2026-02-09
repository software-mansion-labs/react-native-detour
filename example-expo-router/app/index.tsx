import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { styles } from '../src/styles';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>/</Text>
        </Text>
        <Link href="/details" style={styles.link}>
          Go to /details
        </Link>
      </View>
    </View>
  );
}
