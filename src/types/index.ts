export type Config = {
  appID: string;
  API_KEY: string;
  shouldUseClipboard?: boolean;
  handleSchemeLinks?: boolean;
  storage?: DetourStorage;
};

export type RequiredConfig = Required<Config>;

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
