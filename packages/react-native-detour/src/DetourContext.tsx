import { type PropsWithChildren, createContext, useContext, useEffect } from "react";

import { Platform } from "react-native";

import { useAppOpenRetention } from "./analytics/hooks/useAppOpenRetention";
import { useSessionTracking } from "./analytics/hooks/useSessionTracking";
import { analyticsEmitter } from "./analytics/utils/analyticsEmitter";
import { dispatchAnalyticsEvent } from "./analytics/utils/dispatchAnalyticsEvent";
import { useDetour } from "./links/hooks/useDetour";
import type { Config, DetourContextType } from "./links/types";
import { hydrateConsent } from "./shared/consent";
import { requestTrackingPermission } from "./shared/deviceIdentifiers";
import { resolveStorage } from "./shared/storage";

type Props = PropsWithChildren & { config: Config };

const DetourContext = createContext<DetourContextType | undefined>(undefined);

let activeProviderCount = 0;
let hasWarnedUnsupportedWeb = false;

const NOOP_DETOUR_CONTEXT: DetourContextType = {
  isLinkProcessed: true,
  link: null,
  clearLink: () => {},
};

const DetourProviderNative = ({ config, children }: Props) => {
  const {
    apiKey,
    appID,
    shouldUseClipboard = true,
    storage: userStorage,
    linkProcessingMode = "all",
    shouldRequestTrackingPermission = false,
  } = config;

  const storage = resolveStorage(userStorage);

  // Kicked off first so a stored consent choice is back in memory before the ATT
  // prompt (or an early host setConsent) touches it, and so setConsent has a
  // storage handle to persist through from the very first call.
  useEffect(() => {
    hydrateConsent(storage);
  }, [storage]);

  useEffect(() => {
    if (!shouldRequestTrackingPermission) return;
    requestTrackingPermission();
  }, [shouldRequestTrackingPermission]);

  useEffect(() => {
    activeProviderCount++;

    const unsubscribe = analyticsEmitter.subscribe((payload) => {
      if (activeProviderCount > 1) {
        if (__DEV__) {
          console.error(
            `🔗[Detour:ANALYTICS_ERROR] Event "${payload.eventName}" dropped. ` +
              `Multiple DetourProviders (${activeProviderCount}) detected. ` +
              "Analytics logging is disabled until only one provider remains.",
          );
        }
        return;
      }

      dispatchAnalyticsEvent(payload, { apiKey, appID, storage });
    });

    return () => {
      activeProviderCount--;
      unsubscribe();
    };
  }, [apiKey, appID, storage]);

  const value = useDetour({
    apiKey,
    appID,
    shouldUseClipboard,
    storage,
    linkProcessingMode,
  });
  useAppOpenRetention();
  useSessionTracking();

  return <DetourContext.Provider value={value}>{children}</DetourContext.Provider>;
};

export const DetourProvider = ({ config, children }: Props) => {
  if (Platform.OS === "web") {
    if (__DEV__ && !hasWarnedUnsupportedWeb) {
      console.warn(
        "🔗[Detour:WEB_UNSUPPORTED] DetourProvider is disabled on Expo Web. " +
          "SDK initialization is skipped on web and no links will be processed.",
      );
      hasWarnedUnsupportedWeb = true;
    }

    return <DetourContext.Provider value={NOOP_DETOUR_CONTEXT}>{children}</DetourContext.Provider>;
  }

  return <DetourProviderNative config={config}>{children}</DetourProviderNative>;
};

export const useDetourContext = () => {
  const context = useContext(DetourContext);

  if (!context) {
    throw new Error(
      "🔗[Detour:RUNTIME_ERROR] useDetourContext must be used within a DetourProvider",
    );
  }

  return context;
};
