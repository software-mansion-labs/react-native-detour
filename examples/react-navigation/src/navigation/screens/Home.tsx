import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../index';
import { styles } from '../../styles';

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
