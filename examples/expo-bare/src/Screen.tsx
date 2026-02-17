import { useDetourContext } from '@swmansion/react-native-detour';
import { StyleSheet, Text, View } from 'react-native';

export const Screen = () => {
  const { isLinkProcessed, linkRoute, linkType, linkUrl } = useDetourContext();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Detour Expo Bare Example</Text>
        <Text style={styles.instructions}>
          Open a Detour link before installing the app, or open it while the app
          is running as a Universal (iOS) / App (Android) link.
        </Text>
        <Text style={styles.instructions}>
          This example does not navigate. It only shows Detour resolved values
          from context.
        </Text>

        <Text style={styles.status}>
          <Text style={styles.bold}>isLinkProcessed:</Text>{' '}
          {isLinkProcessed ? 'true' : 'false'}
        </Text>

        <Text style={styles.status}>
          <Text style={styles.bold}>linkType:</Text> {linkType ?? 'none'}
        </Text>

        <Text style={styles.status}>
          <Text style={styles.bold}>linkUrl:</Text> {String(linkUrl ?? 'none')}
        </Text>

        <Text style={styles.status}>
          <Text style={styles.resolvedLink}>Resolved route:</Text>{' '}
          {linkRoute ? linkRoute : 'none'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  instructions: {
    fontSize: 13,
    color: '#475569',
  },
  status: {
    fontSize: 12,
    color: '#334155',
  },
  bold: {
    fontWeight: '600',
  },
  resolvedLink: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
