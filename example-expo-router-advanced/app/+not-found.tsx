import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useDetourContext } from '@swmansion/react-native-detour';
import { useAuth } from '../src/auth';
import { styles } from '../src/styles';

export default function NotFoundScreen() {
  const { isLinkProcessed } = useDetourContext();
  const { isSignedIn } = useAuth();

  if (!isLinkProcessed) {
    // Avoid flashing Not Found while Detour resolves a link.
    return null;
  }

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
