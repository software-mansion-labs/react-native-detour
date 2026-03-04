import { Link, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../auth';
import { useDetourContext } from '@swmansion/react-native-detour';
import { styles } from '../../styles';

const ALLOWED_ROUTE = '/details';

export default function HomeScreen() {
  const {
    signOut,
    pendingLink,
    setPendingLink,
    pendingLinkType,
    setPendingLinkType,
  } = useAuth();
  const router = useRouter();
  const { clearLink } = useDetourContext();

  const handleLogout = () => {
    signOut();
    router.replace('/sign-in');
  };

  useEffect(() => {
    if (!pendingLink) return;

    // Pending deep link is resolved only after sign-in.
    const path = pendingLink.split('?')[0] || '/';

    // Only allow deferred deep links to /details for demonstration purposes. Any other route will be rejected and redirected to Not Found.
    // In a real app, you would likely have more complex logic to validate and handle pending deep links.
    if (path !== ALLOWED_ROUTE) {
      setPendingLink(null);
      setPendingLinkType(null);
      clearLink();
      router.replace('/+not-found');
      return;
    }

    const nextParams = pendingLinkType
      ? { fromDeepLink: 'true', linkType: pendingLinkType }
      : { fromDeepLink: 'true' };
    setPendingLink(null);
    setPendingLinkType(null);
    clearLink();
    router.replace({
      pathname: '/(app)/details',
      params: nextParams,
    });
  }, [
    clearLink,
    pendingLink,
    pendingLinkType,
    router,
    setPendingLink,
    setPendingLinkType,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.label}>
          Open a Detour link to test deferred routing after sign in.
        </Text>
        <Text style={styles.instructions}>
          A Detour link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> should immidiately redirect
          there after sign in.
        </Text>
        <Text style={styles.instructions}>
          This app also handles custom scheme links to demonstrate coexistence
          of Detour with custom native intent logic. Try opening a link with the
          scheme{' '}
          <Text style={styles.bold}>detour-expo-router-advanced://app</Text> to
          see it in action.
        </Text>
        <Text style={styles.instructions}>
          Links resolving to any other route should end on Not Found after sign
          in.
        </Text>
        <Text style={styles.info}>
          {pendingLink ? `Pending link: ${pendingLink}` : 'No pending link'}
        </Text>
        <Link href="/(app)/details" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to Details</Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={handleLogout}
          style={[styles.button, styles.dangerButton]}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
