import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../src/auth';
import { styles } from '../src/styles';

export default function HomeScreen() {
  const {
    isSignedIn,
    isUnlocked,
    isUnlocking,
    authError,
    pendingRoute,
    signOut,
    unlock,
    lock,
  } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>/home</Text>
        </Text>
        <Text style={styles.label}>
          Signed in: <Text style={styles.value}>{String(isSignedIn)}</Text>
        </Text>
        <Text style={styles.label}>
          Unlocked: <Text style={styles.value}>{String(isUnlocked)}</Text>
        </Text>
        <Text style={styles.label}>
          Pending route: <Text style={styles.value}>{pendingRoute ?? '-'}</Text>
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={isSignedIn ? signOut : undefined}>
            <Text style={styles.actionText}>Sign out</Text>
          </Pressable>
          <Pressable
            onPress={() => (isUnlocked ? lock() : unlock())}
            disabled={isUnlocking}
          >
            <Text
              style={[
                styles.actionText,
                isUnlocking && styles.actionTextDisabled,
              ]}
            >
              {isUnlocking
                ? 'Unlocking...'
                : isUnlocked
                  ? 'Lock'
                  : 'Unlock (FaceID/Pin)'}
            </Text>
            {authError ? <Text style={styles.error}>{authError}</Text> : null}
          </Pressable>
        </View>
        <Link href="/details" style={styles.link}>
          Go to /details
        </Link>
      </View>
    </View>
  );
}
