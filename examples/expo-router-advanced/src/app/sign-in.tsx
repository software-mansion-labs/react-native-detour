import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../auth';
import { useRouter } from 'expo-router';
import { styles } from '../styles';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    signIn();
    // Navigate home by default. If there's a pending Detour link, useDetourGate
    // will re-fire when isSignedIn flips to true and redirect to the destination.
    router.replace('/(app)/home');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.label}>
          Please sign in to access the app and handle deep links.
        </Text>
        <Text style={styles.instructions}>
          Use a Detour link that resolves to{' '}
          <Text style={styles.bold}>/details</Text> to test deferred redirect
          after sign in.
        </Text>
        <Text style={styles.instructions}>
          This app also handles custom scheme links to demonstrate coexistence
          of Detour with custom native intent logic. Try opening a link with the
          scheme{' '}
          <Text style={styles.bold}>detour-expo-router-advanced://app</Text> to
          see it in action.
        </Text>
        <Pressable onPress={handleSignIn} style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}
