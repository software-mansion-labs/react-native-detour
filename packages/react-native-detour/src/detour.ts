import { setConsent } from "./consent/consent";
import { setEnabled } from "./consent/killSwitch";
import type { DetourConsent } from "./consent/types";
import { setUserId } from "./identity/userId";
import type { DetourUrlEvent, DetourUrlSubscription } from "./links/types/index";
import {
  addReactNavigationEventListener,
  getReactNavigationInitialUrl,
} from "./links/utils/reactNavigation";
import { start } from "./start";

export type DetourApi = {
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
  /** Starts analytics, sessions and deferred link matching after `autoStart: false`. */
  start: () => void;
  /**
   * Passes the user's choice per purpose. Call it on every launch once your consent platform has
   * the choice; each call replaces the previous consent, so pass every purpose in one call.
   */
  setConsent: (consent: DetourConsent, consentText?: string) => void;
  /** `false` turns the SDK off for this install, also on later launches, until `setEnabled(true)`. */
  setEnabled: (enabled: boolean) => void;
};

export const Detour: DetourApi = {
  getInitialURL: getReactNavigationInitialUrl,
  addEventListener: addReactNavigationEventListener,
  setUserId,
  start,
  setConsent,
  setEnabled,
};
