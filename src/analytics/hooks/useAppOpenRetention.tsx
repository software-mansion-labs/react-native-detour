import { useEffect } from 'react';
import { logRetention } from '../analytics';

const DEFAULT_RETENTION_EVENT = 'app_open';

export const useAppOpenRetention = () => {
  useEffect(() => {
    logRetention(DEFAULT_RETENTION_EVENT);
  }, []);
};
