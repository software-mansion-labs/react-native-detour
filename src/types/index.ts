export type Config = {
  appID: string;
  API_KEY: string;
  shouldUseClipboard?: boolean;
  storage?: DetourStorage;
};

export type RequiredConfig = Required<Config>;

export type DetourContextType = {
  deferredLinkProcessed: boolean;
  deferredLink: string | URL | null;
  route: string | null;
};

export interface DetourStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
}
