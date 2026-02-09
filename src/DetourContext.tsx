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

  useEffect(() => {
    activeProviderCount++;

    const unsubscribe = analyticsEmitter.subscribe((eventName, data) => {
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

      sendEvent(API_KEY, appID, { eventName, data });
    });

    return () => {
      activeProviderCount--;
      unsubscribe();
    };
  }, [API_KEY, appID]);

  const storage = resolveStorage(userStorage);
  const value = useDetour({ API_KEY, appID, shouldUseClipboard, storage });

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
