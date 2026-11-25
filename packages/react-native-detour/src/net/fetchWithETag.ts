import { detourFetch } from "./client";
import type { DetourEndpoint } from "./endpoints";
import type { DetourRequestConfig } from "./types";

/** A response to a GET that sends the last `ETag` as `If-None-Match`. */
export type DetourFetchResult =
  | { kind: "updated"; body: unknown; etag: string | null }
  | { kind: "notModified" }
  | { kind: "failed" };

/** GETs an endpoint that answers 304 while `etag` is current. Logs a failure under `logTag`. */
export const fetchWithETag = async (
  endpoint: DetourEndpoint,
  config: DetourRequestConfig,
  etag: string | null,
  logTag: "ATTRIBUTION" | "CONFIG",
): Promise<DetourFetchResult> => {
  try {
    const response = await detourFetch(endpoint, {
      config,
      method: "GET",
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
    if (response === null) return { kind: "failed" };
    if (response.status === 304) return { kind: "notModified" };
    if (!response.ok) {
      console.warn(`🔗[Detour:${logTag}] ${endpoint} fetch failed: ${response.status}`);
      return { kind: "failed" };
    }
    return { kind: "updated", body: await response.json(), etag: response.headers.get("ETag") };
  } catch (error) {
    console.warn(`🔗[Detour:${logTag}] ${endpoint} fetch failed:`, error);
    return { kind: "failed" };
  }
};
