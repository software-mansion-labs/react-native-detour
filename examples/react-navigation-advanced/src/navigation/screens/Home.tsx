import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../index';
import { useAuth } from '../../AuthContext';

export function Home() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, pendingRoute } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.label}>
          Signed-in area. Protected deep links are resumed here after auth.
        </Text>
        <Text style={styles.instructions}>
          Try to open links that resolve to the details screen e.g.:{' '}
          <Text style={styles.bold}>/details</Text> or{' '}
          <Text style={styles.bold}>/details/42</Text>.
        </Text>
        {pendingRoute && (
          <>
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
          </>
        )}

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
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
