import { setUserId } from "./identity/userId";
import type { DetourUrlEvent, DetourUrlSubscription } from "./links/types/index";
import {
  DETOUR_LINKING_PREFIX,
  addReactNavigationEventListener,
  getReactNavigationInitialUrl,
} from "./links/utils/reactNavigation";

export type { DetourUrlEvent, DetourUrlSubscription };

type DetourReactNavigationApi = {
  getInitialURL: () => Promise<string | undefined>;
  addEventListener: (
    event: "url",
    listener: (event: DetourUrlEvent) => void,
  ) => DetourUrlSubscription;
  /**
   * Sets the app's own user identifier, sent with every later request; `null` removes it.
   * A stable account ID: the same for the user on every install, never a guest or anonymous ID.
   * At most 256 characters, and not an e-mail address or a phone number. `Config.userIdValidator`
   * checks the value once `DetourProvider` has mounted.
   */
  setUserId: (userId: string | null) => void;
};

export const Detour: DetourReactNavigationApi = {
  getInitialURL: getReactNavigationInitialUrl,
  addEventListener: addReactNavigationEventListener,
  setUserId,
};

export { DETOUR_LINKING_PREFIX };
