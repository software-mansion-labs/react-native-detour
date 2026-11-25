import type { DetourAttributionProvider } from "../../attribution/types";
import type { UserIdValidator } from "../../identity/userId";

export type Config = {
  appID: string;
  apiKey: string;
  shouldUseClipboard?: boolean;
  shouldTrackAutomaticEvents?: boolean;
  storage?: DetourStorage;
  /**
   * Controls which link sources are handled by the SDK.
   * - `all`: deferred links + runtime Universal/App links + initial URL + custom scheme links (default)
   * - `web-only`: deferred links + runtime Universal/App links + initial URL, but NOT custom scheme links
   * - `deferred-only`: only deferred links — no runtime listener, no initial URL check, no scheme links
   *   (recommended when Expo Router native-intent handler already resolves runtime/initial links)
   */
  linkProcessingMode?: LinkProcessingMode;
  /**
   * Detour API host for tests and non-production environments (https only).
   * Defaults to the production Detour API.
   */
  baseUrl?: string;
  /**
   * Checks every `Detour.setUserId` value, and the stored one, once `DetourProvider` has mounted; returning `false` drops the value and clears the stored one.
   * Use it to reject values that must not leave the device, such as e-mail addresses or phone numbers.
   */
  userIdValidator?: UserIdValidator;
  /**
   * Starts analytics, sessions and deferred link matching on mount (default `true`). With `false`,
   * they wait for `Detour.start()`, so the app can wait for its consent platform first. Links the
   * user taps are routed and counted either way: their click goes out with the app version, OS
   * version and device model, because the plan's click limit applies to it. `isReadyForUI`
   * turns true without waiting for `start()`; `isInitialLinkResolved` waits for it.
   */
  autoStart?: boolean;
  /**
   * Turns on attribution mode: pass `attribution()` from @swmansion/react-native-detour-mmp.
   * Requests feed attribution only with consent to `DetourPurpose.attribution` passed on this
   * launch. The install is attributed from deferred matching, so the first match waits until the
   * attribution gate decides. Use `autoStart: false` only when your law asks for consent to the
   * match itself.
   */
  attribution?: DetourAttributionProvider;
};

export type LinkProcessingMode = "all" | "web-only" | "deferred-only";

export type RequiredConfig = Omit<
  Config,
  | "shouldUseClipboard"
  | "storage"
  | "linkProcessingMode"
  | "shouldTrackAutomaticEvents"
  | "autoStart"
> & {
  shouldUseClipboard: boolean;
  storage: DetourStorage;
  linkProcessingMode: LinkProcessingMode;
};

export type LinkType = "deferred" | "verified" | "scheme";

export type DetourLink = {
  url: string | URL;
  route: string;
  pathname: string;
  params: Record<string, string>;
  type: LinkType;
} | null;

export type DetourContextType = {
  /** True once Detour no longer holds the first screen: hide the splash, show the UI or a consent prompt. */
  isReadyForUI: boolean;
  /** True once the link the app started with is known, so `link` is final: a link or null. */
  isInitialLinkResolved: boolean;
  /**
   * @deprecated Use `isReadyForUI`; it has the same value. Kept so a 2.x app without TypeScript,
   * which would get `undefined` here and never show its UI, still works after the update.
   */
  isLinkProcessed: boolean;
  link: DetourLink;
  clearLink: () => void;
};

export interface DetourStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
}

export type DetourUrlEvent = {
  url: string;
};

export type DetourUrlSubscription = {
  remove: () => void;
};
