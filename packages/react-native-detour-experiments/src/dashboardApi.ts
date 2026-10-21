import { APP_ID_ENV, BASE_URL, CLI_KEY_ENV, DASHBOARD_URL_ENV, SDK_HEADER } from "./config";

/** The CLI Key and the App it belongs to: every Detour Experiments route needs both. */
export type DashboardAuth = {
  cliApiKey?: string | undefined;
  appId?: string | undefined;
};

/**
 * The dashboard every Node-side call goes to: `EXPO_PUBLIC_DETOUR_DASHBOARD_URL`, else the hosted one.
 * The app runtime is pinned to `BASE_URL`.
 */
export function dashboardBaseUrl(): string {
  return process.env[DASHBOARD_URL_ENV]?.replace(/\/+$/, "") || BASE_URL;
}

export function experimentsApiUrl(): string {
  return `${dashboardBaseUrl()}/api/experiments`;
}

/**
 * Headers for a Node-side call, falling back to `DETOUR_CLI_KEY` and `EXPO_PUBLIC_DETOUR_APP_ID`.
 * The app runtime builds its own from the provider's `config`.
 */
export function dashboardHeaders(auth?: DashboardAuth): Record<string, string> {
  const cliApiKey = auth?.cliApiKey ?? process.env[CLI_KEY_ENV];
  const appId = auth?.appId ?? process.env[APP_ID_ENV];
  return {
    ...(cliApiKey ? { Authorization: `Bearer ${cliApiKey}` } : {}),
    ...(appId ? { "X-App-ID": appId } : {}),
    "X-SDK": SDK_HEADER,
  };
}
