import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { styles } from '../src/styles';

// This screen is used to test deferred deep linking. It can be accessible via a link that resolves to /details.
export default function DetailsScreen() {
  const params = useLocalSearchParams();
  const fromDeepLink = params.fromDeepLink === 'true';
  const linkType = params.linkType || 'unknown';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>/details</Text>
        </Text>
        <Text style={styles.label}>
          {fromDeepLink
            ? `Opened via deep link (${linkType})`
            : 'Opened via button navigation'}
        </Text>
        <Link href="/" style={styles.link}>
          Back to /
        </Link>
      </View>
    </View>
  );
}
