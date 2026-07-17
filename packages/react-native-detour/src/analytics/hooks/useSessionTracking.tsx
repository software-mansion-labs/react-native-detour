import { useEffect } from "react";

import { AppState, type AppStateStatus } from "react-native";

import * as Crypto from "expo-crypto";

// A session groups a contiguous stretch of activity — the basis for funnels,
// time-in-session and LTV. In-memory only (same convention as userIdentity.ts):
// a cold start is inherently a new session, so there's nothing to persist.
let currentSessionId: string = Crypto.randomUUID();
let backgroundedAt: number | null = null;

// 30 min of background before a re-open counts as a fresh session — the
// industry-standard timeout (Google Analytics, Adjust). Shorter trips back to
// the OS (Control Center, a notification, an ATT prompt) keep the same session.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const handleAppStateChange = (nextState: AppStateStatus) => {
  if (nextState === "background" || nextState === "inactive") {
    backgroundedAt = Date.now();
    return;
  }

  if (nextState === "active" && backgroundedAt !== null) {
    if (Date.now() - backgroundedAt > SESSION_TIMEOUT_MS) {
      currentSessionId = Crypto.randomUUID();
    }
    backgroundedAt = null;
  }
};

export const useSessionTracking = () => {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);
};

export const getSessionId = (): string => currentSessionId;
