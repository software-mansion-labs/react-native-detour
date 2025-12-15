export type Config = {
  appID: string;
  API_KEY: string;
  shouldUseClipboard?: boolean;
};

export type RequiredConfig = Required<Config>;

export type DetourContextType = {
  deferredLinkProcessed: boolean;
  deferredLink: string | URL | null;
  route: string | null;
};
