export type Config = {
  appID: string;
  API_KEY: string;
  shouldUseClipboard?: boolean;
  handleSchemeLinks?: boolean;
  storage?: DetourStorage;
  /**
   * Controls which link sources are handled by the hook.
   * - `all`: runtime links + initial URL + deferred links (default behavior)
   * - `deferred-only`: only deferred links (recommended when Expo Router
   *   native-intent handler already resolves runtime/initial links)
   */
  linkProcessingMode?: LinkProcessingMode;
};

export type LinkProcessingMode = 'all' | 'deferred-only';

export type RequiredConfig = Omit<
  Config,
  'shouldUseClipboard' | 'handleSchemeLinks' | 'storage' | 'linkProcessingMode'
> & {
  shouldUseClipboard: boolean;
  handleSchemeLinks: boolean;
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
