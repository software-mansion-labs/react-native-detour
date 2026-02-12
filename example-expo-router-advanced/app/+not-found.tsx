import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../src/auth';
import { styles } from '../src/styles';

export default function NotFoundScreen() {
  const { isSignedIn } = useAuth();

  const backHref = isSignedIn ? '/home' : '/';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Link href={backHref} style={styles.link}>
          Go back
        </Link>
      </View>
    </View>
  );
}
