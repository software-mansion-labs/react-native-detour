import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Config, DetourContextType } from './types';
import { useDetour } from './hooks/useDetour';
import { resolveStorage } from './utils/storage';

type Props = PropsWithChildren & { config: Config };

const DetourContext = createContext<DetourContextType | undefined>(undefined);

export const DetourProvider = ({ config, children }: Props) => {
  const {
    apiKey: API_KEY,
    appID,
    shouldUseClipboard = true,
    handleSchemeLinks = true,
    storage: userStorage,
    linkProcessingMode = 'all',
  } = config;

  const storage = resolveStorage(userStorage);

  const value = useDetour({
    apiKey: API_KEY,
    appID,
    shouldUseClipboard,
    handleSchemeLinks,
    storage,
    linkProcessingMode,
  });

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
