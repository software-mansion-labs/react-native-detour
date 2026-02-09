import { AuthScreen } from '../src/AuthScreen';

export default function HomeScreen() {
  return (
    <AuthScreen
      routeLabel="/home"
      linkHref="/details"
      linkText="Go to /details"
    />
  );
}
