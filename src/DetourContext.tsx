import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Config, DetourContextType } from './types';
import { useDetour } from './hooks/useDetour';

type Props = PropsWithChildren & { config: Config };

const DetourContext = createContext<DetourContextType | undefined>(undefined);

export const DetourProvider = ({ config, children }: Props) => {
  const { API_KEY, appID, shouldUseClipboard = true } = config;
  const value = useDetour({ API_KEY, appID, shouldUseClipboard });

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
