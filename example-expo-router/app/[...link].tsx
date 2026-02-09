import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useDetourContext } from '@swmansion/react-native-detour';
import { Link, useRouter } from 'expo-router';
import { styles } from '../src/styles';

const NotFoundScreen = () => {
  const { isLinkProcessed } = useDetourContext();

  if (!isLinkProcessed) {
    return null;
  }

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
};

// Catch-all route to keep Expo Router from showing Not Found
// while Detour resolves unknown/short links.
export default function CatchAllRoute() {
  const { isLinkProcessed, linkRoute, linkUrl, clearLink } = useDetourContext();
  const router = useRouter();
  const shouldShowNotFound =
    isLinkProcessed &&
    ((linkRoute && linkRoute !== '/details') || (!linkRoute && !linkUrl));

  // If the link is processed and matches a known route, navigate there.
  useEffect(() => {
    if (!isLinkProcessed) return;
    if (linkRoute === '/details') {
      router.replace(linkRoute);
    }
  }, [isLinkProcessed, linkRoute, router]);

  // Clear the link if it's processed but doesn't match a known route to prevent loops.
  useEffect(() => {
    if (!shouldShowNotFound) return;
    clearLink();
  }, [clearLink, shouldShowNotFound]);

  if (shouldShowNotFound) {
    return <NotFoundScreen />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Handling link...</Text>
        <Text style={styles.label}>Please wait</Text>
      </View>
    </View>
  );
}
