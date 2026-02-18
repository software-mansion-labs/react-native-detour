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
        <Text style={styles.instructions}>
          Open a link before installing the app, or open it while the app is
          running as a Universal (iOS) / App (Android) link to test the
          redirect.
        </Text>
        <Text style={styles.instructions}>
          For example, link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> route should open the
          Details screen. For other links, the app should open the Not Found
          screen.
        </Text>
        <Link href="/details" style={styles.link}>
          Go to /details
        </Link>
      </View>
    </View>
  );
}
