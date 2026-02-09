import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from './auth';
import { styles } from './styles';

type AuthScreenProps = {
  routeLabel: string;
  linkHref: string;
  linkText: string;
};

export const AuthScreen = ({
  routeLabel,
  linkHref,
  linkText,
}: AuthScreenProps) => {
  const {
    isSignedIn,
    isUnlocked,
    isUnlocking,
    authError,
    pendingRoute,
    signIn,
    signOut,
    unlock,
    lock,
  } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Route: <Text style={styles.value}>{routeLabel}</Text>
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
          <Pressable onPress={isSignedIn ? signOut : signIn}>
            <Text style={styles.actionText}>
              {isSignedIn ? 'Sign out' : 'Sign in'}
            </Text>
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
        <Link href={linkHref} style={styles.link}>
          {linkText}
        </Link>
      </View>
    </View>
  );
};
