import { setUserId } from "./identity/userId";
import type { DetourUrlEvent, DetourUrlSubscription } from "./links/types/index";
import {
  DETOUR_LINKING_PREFIX,
  addReactNavigationEventListener,
  getReactNavigationInitialUrl,
} from "./links/utils/reactNavigation";
import { start } from "./start";

export type { DetourUrlEvent, DetourUrlSubscription };

type DetourReactNavigationApi = {
  getInitialURL: () => Promise<string | undefined>;
  addEventListener: (
    event: "url",
    listener: (event: DetourUrlEvent) => void,
  ) => DetourUrlSubscription;
  /**
   * Sets the app's own user identifier, sent with every later request; `null` removes it.
   * Must not be an e-mail address or a phone number. `Config.userIdValidator` applies once
   * `DetourProvider` has mounted.
   */
  setUserId: (userId: string | null) => void;
  /** Starts analytics, sessions and deferred link matching after `autoStart: false`. */
  start: () => void;
};

export const Detour: DetourReactNavigationApi = {
  getInitialURL: getReactNavigationInitialUrl,
  addEventListener: addReactNavigationEventListener,
  setUserId,
  start,
};

export { DETOUR_LINKING_PREFIX };
