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
   * Called on every `Detour.setUserId`; returning `false` drops the value and clears the stored one.
   * Use it to reject values that must not leave the device, such as e-mail addresses or phone numbers.
   */
  userIdValidator?: (userId: string) => boolean;
};

export type LinkProcessingMode = "all" | "web-only" | "deferred-only";

export type RequiredConfig = Omit<
  Config,
  "shouldUseClipboard" | "storage" | "linkProcessingMode" | "shouldTrackAutomaticEvents"
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
