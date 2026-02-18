import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { signIn, pendingLink } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    signIn();
    router.replace('/(app)/home');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.label}>
          Please sign in to access the app and handle deep links.
        </Text>
        <Text style={styles.instructions}>
          Use a Detour link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> to test deferred redirect
          after sign in.
        </Text>
        <Text style={styles.instructions}>
          This app also handles custom scheme links to demonstrate coexistence
          of Detour with custom native intent logic. Try opening a link with the
          scheme{' '}
          <Text style={styles.bold}>detour-expo-router-advanced://app</Text> to
          see it in action.
        </Text>
        <Text style={styles.pendingInfo}>
          {pendingLink ? `Pending link: ${pendingLink}` : 'No pending link'}
        </Text>
        <Pressable onPress={handleSignIn} style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    gap: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
  instructions: {
    fontSize: 13,
    textAlign: 'center',
    color: '#475569',
  },
  bold: {
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pendingInfo: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});
