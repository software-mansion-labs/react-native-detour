import { useNavigation, useRoute } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '..';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export function Details() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Details'>>();
  const fromDeepLink = route.params?.fromDeepLink;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details</Text>
      <Text style={styles.label}>
        {fromDeepLink ? 'Opened via deep link' : 'Opened via button navigation'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Home')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Go to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
