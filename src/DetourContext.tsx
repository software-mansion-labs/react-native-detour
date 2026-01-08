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

export const DetourProvider = ({ config, children }: Props) => {
  const {
    API_KEY,
    appID,
    shouldUseClipboard = true,
    storage: userStorage,
  } = config;

  useEffect(() => {
    const unsubscribe = analyticsEmitter.subscribe((eventName, data) => {
      sendEvent(API_KEY, appID, { eventName, data });
    });

    return unsubscribe;
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
