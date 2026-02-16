import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth';

export default function IndexScreen() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/sign-in" />;
}
