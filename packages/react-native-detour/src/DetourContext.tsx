import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import type { Config, DetourContextType } from './links/types';
import { analyticsEmitter } from './analytics/utils/analyticsEmitter';
import { sendEvent } from './analytics/api/events';
import { resolveStorage } from './links/utils/storage';
import { useDetour } from './links/hooks/useDetour';
import { prepareDeviceIdForApi } from './analytics/utils/devicePersistence';
import { sendRetentionEvent } from './analytics/api/retention';
import type { DetourEvent, DetourEventNames } from './analytics/types';
import { useAppOpenRetention } from './analytics/hooks/useAppOpenRetention';

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
    linkProcessingMode = 'all',
  } = config;

  const storage = resolveStorage(userStorage);

  useEffect(() => {
    activeProviderCount++;

    const unsubscribe = analyticsEmitter.subscribe(
      async ({ eventName, data, isRetention }) => {
        if (activeProviderCount > 1) {
          if (__DEV__) {
            console.error(
              `🔗[Detour:ANALYTICS_ERROR] Event "${eventName}" dropped. ` +
                `Multiple DetourProviders (${activeProviderCount}) detected. ` +
                'Analytics logging is disabled until only one provider remains.'
            );
          }
          return;
        }

        try {
          const deviceId = await prepareDeviceIdForApi(storage);

          if (isRetention) {
            sendRetentionEvent({ apiKey, appID, eventName, deviceId });
          } else {
            const event: DetourEvent = {
              eventName: eventName as DetourEventNames,
              data,
            };
            sendEvent({
              apiKey,
              appID,
              event,
              deviceId,
            });
          }
        } catch (error) {
          console.error(
            '[Detour:ANALYTICS_ERROR] Analytics disabled due to storage/runtime failure:',
            error
          );
        }
      }
    );

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

  return (
    <DetourContext.Provider value={value}>{children}</DetourContext.Provider>
  );
};

export const DetourProvider = ({ config, children }: Props) => {
  if (Platform.OS === 'web') {
    if (__DEV__ && !hasWarnedUnsupportedWeb) {
      console.warn(
        '🔗[Detour:WEB_UNSUPPORTED] DetourProvider is disabled on Expo Web. ' +
          'SDK initialization is skipped on web and no links will be processed.'
      );
      hasWarnedUnsupportedWeb = true;
    }

    return (
      <DetourContext.Provider value={NOOP_DETOUR_CONTEXT}>
        {children}
      </DetourContext.Provider>
    );
  }

  return (
    <DetourProviderNative config={config}>{children}</DetourProviderNative>
  );
};

export const useDetourContext = () => {
  const context = useContext(DetourContext);

  if (!context) {
    throw new Error(
      '🔗[Detour:RUNTIME_ERROR] useDetourContext must be used within a DetourProvider'
    );
  }

  return context;
};
