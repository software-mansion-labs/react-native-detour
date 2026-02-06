import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useDetourContext } from '@swmansion/react-native-detour';
import { useAuth } from '../src/auth';
import { styles } from '../src/styles';
import { useRouter } from 'expo-router';

export default function CatchAllRoute() {
  const { isLinkProcessed, linkRoute } = useDetourContext();
  const { isSignedIn, isUnlocked, pendingRoute } = useAuth();
  const router = useRouter();
  const canHandleLink = isSignedIn && isUnlocked;

  useEffect(() => {
    if (!isLinkProcessed) return;

    if (pendingRoute && !canHandleLink) {
      router.replace(isSignedIn ? '/home' : '/');
      return;
    }

    if (!linkRoute && !pendingRoute) {
      router.replace(isSignedIn ? '/home' : '/');
    }
  }, [
    canHandleLink,
    isLinkProcessed,
    isSignedIn,
    linkRoute,
    pendingRoute,
    router,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Handling link...</Text>
        <Text style={styles.label}>Please wait</Text>
      </View>
    </View>
  );
}
