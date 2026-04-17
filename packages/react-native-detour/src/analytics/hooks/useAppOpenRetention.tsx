import { useEffect } from "react";

import { logRetention } from "../analytics";
import { DEFAULT_RETENTION_EVENT } from "../const/definedEvents";

let isColdStartLogged = false;

export const useAppOpenRetention = () => {
  useEffect(() => {
    if (!isColdStartLogged) {
      logRetention(DEFAULT_RETENTION_EVENT);
      isColdStartLogged = true;
    }
  }, []);
};
