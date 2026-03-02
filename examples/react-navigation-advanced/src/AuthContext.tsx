import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RootStackParamList } from './navigation';

export type PendingRoute = {
  name: 'Details';
  params?: RootStackParamList['Details'];
};

type AuthContextType = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  pendingRoute: PendingRoute | null;
  setPendingRoute: (route: PendingRoute) => void;
  clearPendingRoute: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This context simulates a simple auth system and holds pending route information for resuming protected deep links after sign in.
// In a real app, pending route information would likely be stored in a more persistent storage and include more details for better resuming behavior.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingRoute, setPendingRouteState] = useState<PendingRoute | null>(
    null
  );

  const login = useCallback(() => {
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setPendingRouteState(null);
  }, []);

  const setPendingRoute = useCallback((route: PendingRoute) => {
    setPendingRouteState(route);
  }, []);

  const clearPendingRoute = useCallback(() => {
    setPendingRouteState(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      login,
      logout,
      pendingRoute,
      setPendingRoute,
      clearPendingRoute,
    }),
    [
      clearPendingRoute,
      isLoggedIn,
      login,
      logout,
      pendingRoute,
      setPendingRoute,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
