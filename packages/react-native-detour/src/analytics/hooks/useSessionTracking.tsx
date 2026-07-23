import { useEffect } from "react";

import { AppState, type AppStateStatus } from "react-native";

import { generateUUID } from "../../shared/uuid";

// In-memory only — a cold start is inherently a new session.
let currentSessionId: string = generateUUID();
let backgroundedAt: number | null = null;

// 30 min background before a re-open counts as a fresh session (same
// threshold as Google Analytics/Adjust).
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const handleAppStateChange = (nextState: AppStateStatus) => {
  if (nextState === "background" || nextState === "inactive") {
    backgroundedAt = Date.now();
    return;
  }

  if (nextState === "active" && backgroundedAt !== null) {
    if (Date.now() - backgroundedAt > SESSION_TIMEOUT_MS) {
      currentSessionId = generateUUID();
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
