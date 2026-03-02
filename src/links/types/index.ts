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
};

export type LinkProcessingMode = 'all' | 'web-only' | 'deferred-only';

export type RequiredConfig = Omit<
  Config,
  'shouldUseClipboard' | 'storage' | 'linkProcessingMode'
> & {
  shouldUseClipboard: boolean;
  storage: DetourStorage;
  linkProcessingMode: LinkProcessingMode;
};

export type LinkType = 'deferred' | 'verified' | 'scheme';

export type DetourContextType = {
  isLinkProcessed: boolean;
  linkUrl: string | URL | null;
  linkType: LinkType | null;
  linkRoute: string | null;
  clearLink: () => void;
};

export interface DetourStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
}
