import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import type { Config, DetourContextType } from './links/types';
import { analyticsEmitter } from './analytics/utils/analyticsEmitter';
import { sendEvent } from './analytics/api/events';
import { resolveStorage } from './links/utils/storage';
import { useDetour } from './links/hooks/useDetour';
import { prepareDeviceIdForApi } from './analytics/utils/devicePersistence';
import { sendRetentionEvent } from './analytics/api/retention';
import type { DetourEventNames } from './analytics/types';
import { useAppOpenRetention } from './analytics/hooks/useAppOpenRetention';

type Props = PropsWithChildren & { config: Config };

const DetourContext = createContext<DetourContextType | undefined>(undefined);

let activeProviderCount = 0;

export const DetourProvider = ({ config, children }: Props) => {
  const {
    API_KEY,
    appID,
    shouldUseClipboard = true,
    storage: userStorage,
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

        if (isRetention) {
          const deviceId = await prepareDeviceIdForApi(storage);
          sendRetentionEvent({ API_KEY, appID, eventName, deviceId });
        } else {
          sendEvent(API_KEY, appID, {
            eventName: eventName as DetourEventNames,
            data,
          });
        }
      }
    );

    return () => {
      activeProviderCount--;
      unsubscribe();
    };
  }, [API_KEY, appID, storage]);

  const value = useDetour({ API_KEY, appID, shouldUseClipboard, storage });
  useAppOpenRetention();

  return (
    <DetourContext.Provider value={value}>{children}</DetourContext.Provider>
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
