import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../AuthContext';

export function Login() {
  const { login, pendingRoute } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.label}>
          This example protects <Text style={styles.bold}>Details</Text> and
          resumes pending deep links after sign in.
        </Text>
        <Text style={styles.instructions}>
          Try links resolving to <Text style={styles.bold}>/details/:id?</Text>{' '}
          while signed out. The app should keep a pending target and continue
          after login.
        </Text>

        {pendingRoute && (
          <View style={styles.container}>
            <Text style={styles.sectionTitle}>Pending route</Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>name:</Text>{' '}
              {pendingRoute?.name ?? 'none'}
            </Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>source:</Text>{' '}
              {pendingRoute?.params?.source ?? 'none'}
            </Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>id:</Text>{' '}
              {pendingRoute?.params?.id ?? 'none'}
            </Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={login}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontSize: 14,
    color: '#475569',
  },
  instructions: {
    fontSize: 13,
    color: '#64748b',
  },
  bold: {
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoValue: {
    fontSize: 12,
  },
  infoKey: {
    fontWeight: '700',
    color: '#0f172a',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
