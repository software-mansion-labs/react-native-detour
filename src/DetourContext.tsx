import { createContext, useContext, type ReactNode } from 'react';
import { useDeferredLink } from './hooks/useDeferredLink';

type DetourContextType = ReturnType<typeof useDeferredLink>;

const DetourContext = createContext<DetourContextType | undefined>(undefined);

export const DetourProvider = ({
  API_KEY,
  children,
}: {
  API_KEY: string;
  children: ReactNode;
}) => {
  const value = useDeferredLink({ API_KEY });

  return (
    <DetourContext.Provider value={value}>{children}</DetourContext.Provider>
  );
};

export const useDetourContext = () => {
  const context = useContext(DetourContext);

  if (!context) {
    throw new Error('useDetourContext must be used within a DetourProvider');
  }

  return context;
};
