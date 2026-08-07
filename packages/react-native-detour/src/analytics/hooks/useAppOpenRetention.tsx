import { useEffect } from "react";

import { logRetention } from "../analytics";
import { DEFAULT_RETENTION_EVENT } from "../const/definedEvents";

let isColdStartLogged = false;

export const useAppOpenRetention = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!isColdStartLogged) {
      logRetention(DEFAULT_RETENTION_EVENT);
      isColdStartLogged = true;
    }
  }, [enabled]);
};
