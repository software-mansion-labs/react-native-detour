export type Config = {
  appID: string;
  apiKey: string;
  shouldUseClipboard?: boolean;
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
   * If `true`, Detour triggers the native App Tracking Transparency prompt on
   * iOS (via `expo-tracking-transparency`) shortly after the provider mounts,
   * so it can read the IDFA. No-op on Android/web. Default: `false` — the end
   * user's consent belongs to the host app, so this stays opt-in and the host
   * app remains free to request permission itself at a better-timed moment
   * (e.g. after an explanatory screen).
   */
  shouldRequestTrackingPermission?: boolean;
};

export type LinkProcessingMode = "all" | "web-only" | "deferred-only";

export type RequiredConfig = Omit<
  Config,
  "shouldUseClipboard" | "storage" | "linkProcessingMode"
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
