import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

type AuthContextType = {
  isSignedIn: boolean;
  isUnlocked: boolean;
  isUnlocking: boolean;
  authError: string | null;
  pendingRoute: string | null;
  lastHandledRoute: string | null;
  signIn: () => void;
  signOut: () => void;
  unlock: () => Promise<void>;
  lock: () => void;
  setPendingRoute: (route: string) => void;
  clearPendingRoute: () => void;
  setLastHandledRoute: (route: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [isSignedIn, setSignedIn] = useState(false);
  const [isUnlocked, setUnlocked] = useState(false);
  const [isUnlocking, setUnlocking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingRoute, setPendingRouteState] = useState<string | null>(null);
  const [lastHandledRoute, setLastHandledRoute] = useState<string | null>(null);

  const signIn = () => {
    setSignedIn(true);
    setUnlocked(false);
  };

  const signOut = () => {
    setSignedIn(false);
    setUnlocked(false);
    setPendingRouteState(null);
    setLastHandledRoute(null);
    setAuthError(null);
  };

  const unlock = async () => {
    setAuthError(null);
    setUnlocking(true);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setAuthError('Biometrics not available on this device.');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setAuthError('No biometrics enrolled.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock to continue',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setUnlocked(true);
      } else {
        setAuthError(
          result.error ? `Auth failed: ${result.error}` : 'Auth canceled.'
        );
      }
    } catch (error) {
      setAuthError('Local authentication failed.');
    } finally {
      setUnlocking(false);
    }
  };
  const lock = () => setUnlocked(false);

  const setPendingRoute = (route: string) => setPendingRouteState(route);
  const clearPendingRoute = () => setPendingRouteState(null);

  const value = useMemo(
    () => ({
      isSignedIn,
      isUnlocked,
      isUnlocking,
      authError,
      pendingRoute,
      lastHandledRoute,
      signIn,
      signOut,
      unlock,
      lock,
      setPendingRoute,
      clearPendingRoute,
      setLastHandledRoute,
    }),
    [
      isSignedIn,
      isUnlocked,
      isUnlocking,
      authError,
      pendingRoute,
      lastHandledRoute,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
