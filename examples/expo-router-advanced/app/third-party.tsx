import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../src/auth';
import { styles } from '../src/styles';

// This screen is used to handle deep links from third-party sources, such as native intents or custom schemes.
export default function ThirdPartyScreen() {
  const { isSignedIn } = useAuth();
  const { raw } = useLocalSearchParams<{ raw?: string }>();
  const backHref = isSignedIn ? '/(app)/home' : '/sign-in';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Third-party deep link</Text>
        <Text style={styles.label}>
          Native intent redirected a custom scheme link here.
        </Text>
        <Text style={styles.label}>
          {raw ? (
            <>
              Raw URL: <Text style={styles.value}>{raw}</Text>
            </>
          ) : (
            'Raw URL not provided'
          )}
        </Text>
        <Link href={backHref} style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
