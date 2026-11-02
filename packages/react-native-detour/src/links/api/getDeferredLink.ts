import * as Application from "expo-application";

import { detourFetch } from "../../net/client";
import { buildApiUrl } from "../../net/endpoints";
import type { RequiredConfig } from "../types";
import { parseInstallReferrer } from "../utils/installReferrer";
import { buildDirectMatchRequest, buildSignalMatchRequest } from "../utils/matchSignals";

export const getDeferredLink = async ({
  apiKey: API_KEY,
  appID,
  shouldUseClipboard,
  baseUrl,
  deviceId,
  userId,
}: Pick<RequiredConfig, "apiKey" | "appID" | "shouldUseClipboard" | "baseUrl"> & {
  deviceId: string;
  userId: string | null;
}) => {
  // Checked before the referrer and clipboard are read, so nothing is collected for a request
  // that will not be sent.
  if (buildApiUrl("matchLink", baseUrl) === null) return null;

  let referrer: string | null = null;
  try {
    referrer = await Application.getInstallReferrerAsync();
  } catch {
    referrer = null;
  }

  const parsedReferrer = referrer?.trim() ? parseInstallReferrer(referrer) : null;
  const referrerClickId = parsedReferrer?.clickId ?? null;

  // The referrer goes with both match requests: an install from an ad without a Detour click ID
  // still reports its gclid.
  const matchContext = {
    device_id: deviceId,
    ...(userId !== null && { user_id: userId }),
    ...(parsedReferrer && { install_referrer: parsedReferrer.installReferrer }),
  };

  const matchRequest =
    referrerClickId !== null
      ? buildDirectMatchRequest(referrerClickId)
      : await buildSignalMatchRequest(shouldUseClipboard);

  const response = await detourFetch("matchLink", {
    config: { apiKey: API_KEY, appID, baseUrl },
    body: { ...matchRequest, ...matchContext },
    retries: 1,
  });
  if (response === null) return null;

  try {
    if (!response.ok) {
      if (response.status === 404) {
        console.warn("🔗[Detour:WARNING] No matching deferred link found");
        return null;
      }

      let errorMessage = "Request failed";

      try {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMessage =
            typeof errorBody.error === "string" ? errorBody.error : JSON.stringify(errorBody.error);
        }
      } catch {
        // If the response isn't JSON (e.g., 500 Internal Server Error HTML),
        // fall back to the generic status code message.
      }

      throw new Error(`[${response.status}] ${errorMessage}`);
    }

    const data = await response.json();
    return data.link || null;
  } catch (error) {
    console.error("🔗[Detour:NETWORK_ERROR] Error fetching deferred link:", error);
    return null;
  }
};
