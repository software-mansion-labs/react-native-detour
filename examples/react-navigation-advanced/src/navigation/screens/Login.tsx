import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../AuthContext';
import { styles } from '../../styles';

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
          Try links resolving to <Text style={styles.bold}>/details</Text> or{' '}
          <Text style={styles.bold}>/details?id=42</Text> while signed out. The
          app should keep a pending target and continue after login.
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
            {pendingRoute?.params?.linkParams &&
              Object.entries(pendingRoute.params.linkParams).map(
                ([key, value]) => (
                  <Text key={key} style={styles.infoValue}>
                    <Text style={styles.infoKey}>{key}:</Text> {value}
                  </Text>
                )
              )}
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
