import * as Application from "expo-application";

import { type RequestIdentity, identityFields } from "../../identity/requestIdentity";
import { buildApiUrl } from "../../net/endpoints";
import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";
import { parseInstallReferrer } from "../utils/installReferrer";
import {
  type DirectMatchRequest,
  type SignalMatchRequest,
  buildDirectMatchRequest,
  buildSignalMatchRequest,
} from "../utils/matchSignals";

const sendMatchRequest = async ({
  url,
  API_KEY,
  appID,
  requestBody,
}: {
  url: string;
  API_KEY: string;
  appID: string;
  requestBody: (SignalMatchRequest | DirectMatchRequest) & RequestIdentity;
}): Promise<Response> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "X-App-ID": appID,
      "X-SDK": SDK_HEADER_VALUE,
    },
    body: JSON.stringify(requestBody),
  });

  return response;
};

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
  const url = buildApiUrl("matchLink", baseUrl);
  if (url === null) return null;

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
    ...identityFields(deviceId, userId),
    ...(parsedReferrer && { install_referrer: parsedReferrer.installReferrer }),
  };

  const matchRequest =
    referrerClickId !== null
      ? buildDirectMatchRequest(referrerClickId)
      : await buildSignalMatchRequest(shouldUseClipboard);

  const response = await sendMatchRequest({
    url,
    API_KEY,
    appID,
    requestBody: { ...matchRequest, ...matchContext },
  });

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
