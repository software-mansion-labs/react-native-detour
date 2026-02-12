import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../index';
import { useDetourContext } from '@swmansion/react-native-detour';
import { useEffect } from 'react';
import { useAuth } from '../../AuthContext';

// The Home screen is the main landing page of the app. It also handles deferred deep links after login.
// For simplicity, this example only handles a single deferred deep link route (/details),
// but you can expand this logic to support more complex routing as needed.

// Note: In a real app, you would likely want to handle deep links at a higher level (e.g. in the root navigator)
// rather than within an individual screen, to ensure that deep links are properly handled regardless of the user's current location in the app.
export function Home() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { linkRoute, clearLink } = useDetourContext();
  const { logout } = useAuth();

  // Handle deferred deep link after login
  useEffect(() => {
    if (!linkRoute) return;

    const path = linkRoute.split('?')[0] || '/';
    // For this example, we only handle a single `/details` link, but you can expand this to support more complex routing logic.
    // Other links are displayed on the screen but don't trigger any navigation in this example.
    if (path === '/details') {
      clearLink(); // Must clear to prevent redirect loop
      navigation.navigate('Details', { fromDeepLink: true });
    }
  }, [linkRoute, clearLink, navigation]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, styles.bold]}>Home</Text>

      {/* Display the detected deep link */}
      <Text style={styles.info}>
        {linkRoute && `Deep link detected: ${linkRoute}`}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Details')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Go to Details</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={logout}
        style={[styles.button, styles.logoutButton]}
      >
        <Text style={styles.buttonText}>Logout</Text>
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
    paddingHorizontal: 20,
  },
  info: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
