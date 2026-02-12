import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.label}>Open a short link to test redirect.</Text>
        <Link href="/(app)/details" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to Details</Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={signOut}
          style={[styles.button, styles.logoutButton]}
        >
          <Text style={styles.buttonText}>Logout</Text>
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
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  info: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
