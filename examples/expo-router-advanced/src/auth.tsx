import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type AuthContextType = {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  pendingLink: string | null;
  setPendingLink: (link: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  // Minimal auth state used only to demonstrate protected route behavior.
  const [isSignedIn, setSignedIn] = useState(false);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const signIn = () => {
    setSignedIn(true);
  };
  const signOut = () => {
    setSignedIn(false);
    setPendingLink(null);
  };

  const value = useMemo(
    () => ({
      isSignedIn,
      signIn,
      signOut,
      pendingLink,
      setPendingLink,
    }),
    [isSignedIn, pendingLink]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
