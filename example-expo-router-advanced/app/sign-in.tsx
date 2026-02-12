import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { signIn } = useAuth();
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
