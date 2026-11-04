// Runtime-safe: Metro bundles this module into the app, so it must not pull in a Node builtin.
import { SDK_VERSION } from "./version";

export const EXPERIMENTS_DIR = ".detour-experiments";

export const SDK_HEADER = `detour-experiments/${SDK_VERSION}`;

// Not overridable via env, CLI flags, or provider props.
export const BASE_URL =
  "https://detour-website-git-darwin-integration-v2-software-mansion.vercel.app";
export const EXPERIMENTS_API_URL = `${BASE_URL}/api/experiments`;
export const REMOTE_CONFIG_URL = `${EXPERIMENTS_API_URL}/remote-config`;

// No `EXPO_PUBLIC_` prefix on purpose, so it can never be inlined into an app bundle.
export const CLI_KEY_ENV = "DETOUR_CLI_KEY";

export const PUBLISHABLE_KEY_ENV = "EXPO_PUBLIC_DETOUR_API_KEY";

export const APP_ID_ENV = "EXPO_PUBLIC_DETOUR_APP_ID";

export const DASHBOARD_URL_ENV = "EXPO_PUBLIC_DETOUR_DASHBOARD_URL";

export function sdkHeaders(apiKey?: string, appId?: string): Record<string, string> {
  return {
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(appId ? { "X-App-ID": appId } : {}),
    "X-SDK": SDK_HEADER,
  };
}

export type DashboardAuth = {
  cliApiKey?: string | undefined;
  appId?: string | undefined;
};

// Node-side calls only: the app runtime is pinned to `BASE_URL`.
export function dashboardBaseUrl(): string {
  return process.env[DASHBOARD_URL_ENV]?.replace(/\/+$/, "") || BASE_URL;
}

export function experimentsApiUrl(): string {
  return `${dashboardBaseUrl()}/api/experiments`;
}

export function dashboardHeaders(auth?: DashboardAuth): Record<string, string> {
  return sdkHeaders(
    auth?.cliApiKey ?? process.env[CLI_KEY_ENV],
    auth?.appId ?? process.env[APP_ID_ENV],
  );
}
