import { type PropsWithChildren, createContext, useContext, useMemo, useState } from "react";

type AuthContextType = {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  // Minimal auth state used only to demonstrate protected route behavior.
  const [isSignedIn, setSignedIn] = useState(false);

  const signIn = () => {
    setSignedIn(true);
  };
  const signOut = () => {
    setSignedIn(false);
  };

  const value = useMemo(() => ({ isSignedIn, signIn, signOut }), [isSignedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
