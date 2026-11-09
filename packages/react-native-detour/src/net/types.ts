export type DetourRequestConfig = {
  apiKey: string;
  appID: string;
  baseUrl?: string;
};

/** App and device context added to analytics and deferred-matching requests. */
export type RequestContext = {
  app_version?: string;
  build_number?: string;
  os_version?: string;
  network_type?: string;
  locale?: string;
  session_id?: string;
};
