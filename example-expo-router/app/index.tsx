import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useDetourContext } from '@swmansion/react-native-detour';

export default function HomeScreen() {
  const { isLinkProcessed, linkRoute, linkType, linkUrl } = useDetourContext();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detour + Expo Router</Text>
      <Text style={styles.label}>
        isLinkProcessed: {String(isLinkProcessed)}
      </Text>
      <Text style={styles.label}>linkRoute: {linkRoute ?? '-'}</Text>
      <Text style={styles.label}>linkType: {linkType ?? '-'}</Text>
      <Text style={styles.label}>
        linkUrl: {linkUrl ? String(linkUrl) : '-'}
      </Text>
      <Link href="/details" style={styles.link}>
        Go to details
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
  },
  link: {
    marginTop: 12,
    fontSize: 16,
    color: '#2563eb',
  },
});
