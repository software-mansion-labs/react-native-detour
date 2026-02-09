import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { styles } from '../src/styles';

export default function DetailsScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>/details</Text>
        </Text>
        <Link href="/" style={styles.link}>
          Back to /
        </Link>
      </View>
    </View>
  );
}
