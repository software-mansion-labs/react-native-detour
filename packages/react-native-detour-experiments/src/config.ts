// Runtime-safe: Metro bundles this module into the app, so it must not pull in a Node builtin.
import { SDK_VERSION } from "./version";

export const SDK_HEADER = `detour-experiments/${SDK_VERSION}`;

// Hardcoded so that no env variable or provider prop can point an app build at another backend.
export const BASE_URL = "https://godetour.dev";
export const EXPERIMENTS_API_URL = `${BASE_URL}/api/experiments`;
export const REMOTE_CONFIG_URL = `${EXPERIMENTS_API_URL}/remote-config`;

export function sdkHeaders(apiKey?: string, appId?: string): Record<string, string> {
  return {
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(appId ? { "X-App-ID": appId } : {}),
    "X-SDK": SDK_HEADER,
  };
}
