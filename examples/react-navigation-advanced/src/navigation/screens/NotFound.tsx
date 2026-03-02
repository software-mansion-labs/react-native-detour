import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { RootStackParamList } from '..';
import { useAuth } from '../../AuthContext';

export function NotFound() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NotFound'>>();
  const { isLoggedIn } = useAuth();

  const path = route.params?.path;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.label}>
          The link you followed doesn't match any screen in this app.
        </Text>
        {path && (
          <Text style={styles.path}>
            <Text style={styles.pathKey}>path: </Text>
            {path}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: isLoggedIn ? 'Home' : 'Login' }],
            })
          }
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isLoggedIn ? 'Go to Home' : 'Go to Login'}
          </Text>
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
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7',
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991b1b',
  },
  label: {
    fontSize: 14,
    color: '#475569',
  },
  path: {
    fontSize: 12,
    color: '#64748b',
  },
  pathKey: {
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
