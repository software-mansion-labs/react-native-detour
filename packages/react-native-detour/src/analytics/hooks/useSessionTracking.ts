import { useEffect } from "react";

import { AppState } from "react-native";

import { sessionManager } from "../session/sessionManager";
import { analyticsEmitter } from "../utils/analyticsEmitter";

export const useSessionTracking = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    sessionManager.start((event) => analyticsEmitter.emit({ kind: "session", event }));
    if (AppState.currentState === "active") sessionManager.onForeground();

    // "inactive" (iOS app switcher, Control Center) is not a trip to the background.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sessionManager.onForeground();
      if (state === "background") sessionManager.onBackground();
    });

    return () => {
      subscription.remove();
      sessionManager.stop();
    };
  }, [enabled]);
};
