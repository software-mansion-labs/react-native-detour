import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import type { RootStackParamList } from '../index';
import { useAuth } from '../../AuthContext';
import { styles } from '../../styles';

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
          <Text style={styles.bold}>/details?id=42</Text>.
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
            {pendingRoute?.params?.linkParams &&
              Object.entries(pendingRoute.params.linkParams).map(
                ([key, value]) => (
                  <Text key={key} style={styles.infoValue}>
                    <Text style={styles.infoKey}>{key}:</Text> {value}
                  </Text>
                )
              )}
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
          style={[styles.button, styles.dangerButton]}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
