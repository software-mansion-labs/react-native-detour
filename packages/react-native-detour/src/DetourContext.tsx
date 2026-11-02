import { type PropsWithChildren, createContext, useContext, useEffect } from "react";

import { Platform } from "react-native";

import { sendAnalytics } from "./analytics/api/send";
import { useAppOpenRetention } from "./analytics/hooks/useAppOpenRetention";
import { useSessionTracking } from "./analytics/hooks/useSessionTracking";
import { analyticsEmitter } from "./analytics/utils/analyticsEmitter";
import { prepareDeviceIdForApi } from "./analytics/utils/devicePersistence";
import { configureUserId, getUserId } from "./identity/userId";
import { useDetour } from "./links/hooks/useDetour";
import type { Config, DetourContextType } from "./links/types";
import { resolveStorage } from "./links/utils/storage";
import { reportBaseUrl } from "./net/endpoints";

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
    shouldTrackAutomaticEvents = true,
    storage: userStorage,
    linkProcessingMode = "all",
    baseUrl,
    userIdValidator,
  } = config;

  const storage = resolveStorage(userStorage);

  useEffect(() => {
    configureUserId(storage, userIdValidator);
  }, [storage, userIdValidator]);

  useEffect(() => {
    reportBaseUrl(baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    activeProviderCount++;

    const unsubscribe = analyticsEmitter.subscribe(async (request) => {
      if (activeProviderCount > 1) {
        if (__DEV__) {
          console.error(
            `🔗[Detour:ANALYTICS_ERROR] ${request.kind} dropped. ` +
              `Multiple DetourProviders (${activeProviderCount}) detected. ` +
              "Analytics logging is disabled until only one provider remains.",
          );
        }
        return;
      }

      try {
        const deviceId = await prepareDeviceIdForApi(storage);
        const userId = await getUserId();

        sendAnalytics(request, { config: { apiKey, appID, baseUrl }, deviceId, userId });
      } catch (error) {
        console.error(
          "[Detour:ANALYTICS_ERROR] Analytics disabled due to storage/runtime failure:",
          error,
        );
      }
    });

    return () => {
      activeProviderCount--;
      unsubscribe();
    };
  }, [apiKey, appID, storage, baseUrl]);

  const value = useDetour({
    apiKey,
    appID,
    shouldUseClipboard,
    storage,
    linkProcessingMode,
    baseUrl,
  });
  useAppOpenRetention(shouldTrackAutomaticEvents);
  useSessionTracking(shouldTrackAutomaticEvents);

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
