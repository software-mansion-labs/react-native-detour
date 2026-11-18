import { isSdkEnabled } from "../consent/killSwitch";
import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { detourFetch } from "../net/client";
import type { DetourRequestConfig } from "../net/types";
import { isAttributionAllowed } from "./attributionMode";
import type { DetourAttributionHost, DetourFetchResult } from "./types";

const fetchConversionValueSchema = async (
  config: DetourRequestConfig,
  etag: string | null,
): Promise<DetourFetchResult> => {
  // The kill switch stops every request but sdk/disable; the cached schema stays.
  if (!(await isSdkEnabled())) return { kind: "failed" };
  try {
    const response = await detourFetch("conversionValueSchema", {
      config,
      method: "GET",
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
    if (response === null) return { kind: "failed" };
    if (response.status === 304) return { kind: "notModified" };
    if (!response.ok) {
      console.warn(
        `🔗[Detour:ATTRIBUTION] conversion-value-schema fetch failed: ${response.status}`,
      );
      return { kind: "failed" };
    }
    return { kind: "updated", body: await response.json(), etag: response.headers.get("ETag") };
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] conversion-value-schema fetch failed:", error);
    return { kind: "failed" };
  }
};

export const createAttributionHost = (
  storage: DetourStorage,
  config: DetourRequestConfig,
): DetourAttributionHost => ({
  isAttributionAllowed,
  installID: () => getDeviceId(storage),
  fetchConversionValueSchema: (etag) => fetchConversionValueSchema(config, etag),
  storage,
});
