import { Link, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// This screen is the expected destination for Detour links resolving to /details.
export default function DetailsScreen() {
  const params = useLocalSearchParams();
  // For demonstration purposes, we display some info about the incoming link. In a real app, you would likely use the link parameters to fetch data or customize the screen in some way.
  const fromDeepLink = params.fromDeepLink === 'true';
  let linkType = params.linkType || 'unknown';
  if (linkType === 'verified') {
    linkType = Platform.select({
      ios: 'Universal',
      android: 'App',
      default: linkType,
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>/details</Text>
        </Text>
        <Text style={styles.label}>
          {fromDeepLink
            ? `Opened via deep link (${linkType} link)`
            : 'Opened via button navigation'}
        </Text>
        <Text style={styles.instructions}>
          Trigger a Detour link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> to validate this flow.
        </Text>
        <Link href="/(app)/home" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Back to Home</Text>
          </Pressable>
        </Link>
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
  instructions: {
    fontSize: 13,
    color: '#475569',
  },
  bold: {
    fontWeight: '600',
  },
  value: {
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
