import { useDetourContext } from 'detour-react-native';
import { StyleSheet, Text, View } from 'react-native';

export const Screen = () => {
  const { deferredLink, deferredLinkProcessed, route } = useDetourContext();

  console.log(deferredLink, deferredLinkProcessed, route);

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
