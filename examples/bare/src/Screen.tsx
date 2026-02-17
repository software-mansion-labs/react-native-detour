import { useDetourContext } from '@swmansion/react-native-detour';
import { StyleSheet, Text, View } from 'react-native';

export const Screen = () => {
  const { isLinkProcessed, linkRoute, linkType, linkUrl } = useDetourContext();

  console.log(isLinkProcessed, linkRoute, linkType, linkUrl);

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
