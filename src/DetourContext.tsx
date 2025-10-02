import { createContext, useContext, type PropsWithChildren } from 'react';
import { useDeferredLink } from './hooks/useDeferredLink';
import type { Config, DeferredLinkContext } from './types';

type Props = PropsWithChildren & { config: Config };

type DetourContextType = DeferredLinkContext;

const DetourContext = createContext<DetourContextType | undefined>(undefined);

export const DetourProvider = ({ config, children }: Props) => {
  const { API_KEY, appID, shouldUseClipboard = true } = config;
  const value = useDeferredLink({ API_KEY, appID, shouldUseClipboard });

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
