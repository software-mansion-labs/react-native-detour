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

let isProviderMounted = false;

export const DetourProvider = ({ config, children }: Props) => {
  const {
    API_KEY,
    appID,
    shouldUseClipboard = true,
    storage: userStorage,
  } = config;

  useEffect(() => {
    if (__DEV__ && isProviderMounted) {
      console.warn(
        '🔗[Detour:RUNTIME_WARNING] Multiple DetourProviders detected. ' +
          'This may cause duplicate analytics events. Ensure you only have one provider at the root of your app.'
      );
    }
    isProviderMounted = true;
    const unsubscribe = analyticsEmitter.subscribe((eventName, data) => {
      sendEvent(API_KEY, appID, { eventName, data });
    });

    return () => {
      unsubscribe();
      isProviderMounted = false;
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
