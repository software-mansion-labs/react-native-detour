import { SDK_HEADER_VALUE } from "../version";
import { type DetourEndpoint, buildApiUrl } from "./endpoints";
import type { DetourRequestConfig } from "./types";

type DetourFetchOptions = {
  config: DetourRequestConfig;
  body: unknown;
  timeoutMs?: number;
  /** Extra attempts after a network error, a timeout or a 5xx. */
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
// `mmp` comes with the -mmp package; the core SDK always reports `core`.
const SDK_PACKAGE = "core";

const postOnce = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * POSTs to a Detour endpoint with the shared headers. Returns null without a request when
 * `baseUrl` is not https; throws on a network error or timeout like `fetch`.
 */
export const detourFetch = async (
  endpoint: DetourEndpoint,
  { config, body, timeoutMs = DEFAULT_TIMEOUT_MS, retries = 0 }: DetourFetchOptions,
): Promise<Response | null> => {
  const url = buildApiUrl(endpoint, config.baseUrl);
  if (url === null) return null;

  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-App-ID": config.appID,
      "X-SDK": SDK_HEADER_VALUE,
      "X-SDK-Package": SDK_PACKAGE,
    },
    body: JSON.stringify(body),
  };

  for (let attempt = 0; ; attempt++) {
    const isLastAttempt = attempt >= retries;
    try {
      const response = await postOnce(url, init, timeoutMs);
      if (response.status < 500 || isLastAttempt) return response;
    } catch (error) {
      if (isLastAttempt) throw error;
    }
  }
};
