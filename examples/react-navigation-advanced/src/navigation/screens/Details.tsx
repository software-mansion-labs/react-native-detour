import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '..';

export function Details() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Details'>>();

  const fromDeepLink = route.params?.fromDeepLink;
  const source = route.params?.source;
  const id = route.params?.id;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Details</Text>
        <Text style={styles.label}>
          {fromDeepLink
            ? 'Opened via deep link'
            : 'Opened via button navigation'}
        </Text>
        {fromDeepLink && (
          <>
            <Text style={styles.sectionTitle}>Navigation params</Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>source:</Text> {source ?? 'manual'}
            </Text>
            <Text style={styles.infoValue}>
              <Text style={styles.infoKey}>id:</Text> {id ?? 'none'}
            </Text>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
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
  value: {
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
