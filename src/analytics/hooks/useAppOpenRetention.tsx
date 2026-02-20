import { useEffect } from 'react';
import { logRetention } from '../analytics';

const DEFAULT_RETENTION_EVENT = 'app_open';
let isColdStartLogged = false;

export const useAppOpenRetention = () => {
  useEffect(() => {
    if (!isColdStartLogged) {
      logRetention(DEFAULT_RETENTION_EVENT);
      isColdStartLogged = true;
    }
  }, []);
};
