/**
 * Runtime-safe: Metro bundles this module into the app, so it must not pull in a Node builtin.
 * `__tests__/runtime-boundary.test.ts` enforces this.
 */
import { SDK_VERSION } from "./version";

/** Beside `detour-experiments.config.json`. Holds only capture staging, and ignores itself. */
export const EXPERIMENTS_DIR = ".detour-experiments";

/** Sent as the `X-SDK` header on every request. The dashboard stores the version on each Exposure. */
export const SDK_HEADER = `detour-experiments/${SDK_VERSION}`;

/** Hosted Detour Experiments dashboard. Not overridable via env, CLI flags, or provider props. */
export const BASE_URL =
  "https://detour-website-git-darwin-integration-v2-software-mansion.vercel.app";
/** Every Detour Experiments route; each one also takes the App as an `X-App-ID` header. */
export const EXPERIMENTS_API_URL = `${BASE_URL}/api/experiments`;
export const REMOTE_CONFIG_URL = `${EXPERIMENTS_API_URL}/remote-config`;

/**
 * Env var holding the CLI Key for the CLI and MCP. It overrides the key `login` stored.
 * It has no `EXPO_PUBLIC_` prefix on purpose, so it can never be inlined into an app bundle.
 */
export const CLI_KEY_ENV = "DETOUR_CLI_KEY";

/**
 * Env var holding the app's Publishable Key, for Node-side code only. Expo inlines `EXPO_PUBLIC_*`
 * only in the app's own files, so the app reads it and passes the value to the provider.
 */
export const PUBLISHABLE_KEY_ENV = "EXPO_PUBLIC_DETOUR_API_KEY";

/** Env var holding the App ID. The app and Detour's SDK read the same one. */
export const APP_ID_ENV = "EXPO_PUBLIC_DETOUR_APP_ID";

/** Env var naming another dashboard than the hosted one, for the CLI and MCP. */
export const DASHBOARD_URL_ENV = "EXPO_PUBLIC_DETOUR_DASHBOARD_URL";
