import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../index';

// Basic home screen; deep-link handling is managed at app/navigation level.
export function Home() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.label}>
          This is a simple React Navigation + Detour integration.
        </Text>
        <Text style={styles.instructions}>
          Trigger a Detour link resolving to{' '}
          <Text style={styles.bold}>/details</Text> to test redirect.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Details')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go to Details</Text>
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
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
