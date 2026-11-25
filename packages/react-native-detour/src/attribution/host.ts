import { isSdkEnabled } from "../consent/killSwitch";
import { getDeviceId } from "../identity/deviceId";
import type { DetourStorage } from "../links/types";
import { type DetourFetchResult, fetchWithETag } from "../net/fetchWithETag";
import type { DetourRequestConfig } from "../net/types";
import { isAttributionAllowed } from "./attributionMode";
import type { DetourAttributionHost } from "./types";

const fetchConversionValueSchema = async (
  config: DetourRequestConfig,
  etag: string | null,
): Promise<DetourFetchResult> => {
  // The kill switch stops every request but sdk/disable; the cached schema stays.
  if (!(await isSdkEnabled())) return { kind: "failed" };
  return fetchWithETag("conversionValueSchema", config, etag, "ATTRIBUTION");
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
