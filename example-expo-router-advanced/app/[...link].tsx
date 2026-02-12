import { Text, View } from 'react-native';
import { styles } from '../src/styles';

export default function CatchAllRoute() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Handling link...</Text>
        <Text style={styles.label}>Please wait</Text>
      </View>
    </View>
  );
}
