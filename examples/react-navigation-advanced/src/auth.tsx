import { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "detour_onboarding_seen";
const AUTH_KEY = "detour_is_signed_in";

type AuthContextType = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isOnboardingCompleted: boolean;
  signIn: () => void;
  signOut: () => void;
  markOnboardingCompleted: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [isLoaded, setLoaded] = useState(false);
  const [isSignedIn, setSignedIn] = useState(false);
  const [isOnboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AUTH_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ]).then(([auth, onboarding]) => {
      setSignedIn(auth === "true");
      setOnboardingCompleted(onboarding === "true");
      setLoaded(true);
    });
  }, []);

  const signIn = () => {
    AsyncStorage.setItem(AUTH_KEY, "true");
    setSignedIn(true);
  };
  const signOut = () => {
    AsyncStorage.removeItem(AUTH_KEY);
    setSignedIn(false);
  };
  const markOnboardingCompleted = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setOnboardingCompleted(true);
  };

  const value = useMemo(
    () => ({ isLoaded, isSignedIn, isOnboardingCompleted, signIn, signOut, markOnboardingCompleted }),
    [isLoaded, isSignedIn, isOnboardingCompleted],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
