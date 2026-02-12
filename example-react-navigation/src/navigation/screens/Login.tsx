import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../AuthContext';

// The Login screen is the entry point for unauthenticated users. It allows users to sign in and access the app.
// In a real app, this would likely involve a form for entering credentials and communicating with an authentication
// API, but for simplicity, this example just has a button that simulates signing in.
export function Login() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, styles.bold]}>Welcome</Text>
      <Text style={styles.label}>
        Open a link that resolves to <Text style={styles.bold}>/details</Text>{' '}
        route before installing the app, or open it while the app is running as
        a Universal Link (iOS) / App Link (Android) to test the redirect.
      </Text>
      <Text style={styles.label}>
        Please sign in to access the app and handle deep links.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={login}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  title: {
    fontSize: 20,
  },
  bold: {
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
