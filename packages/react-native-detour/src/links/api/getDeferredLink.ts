import * as Application from "expo-application";

import { buildApiUrl } from "../../net/endpoints";
import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";
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
  requestBody: SignalMatchRequest | DirectMatchRequest;
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
}: Pick<RequiredConfig, "apiKey" | "appID" | "shouldUseClipboard" | "baseUrl">) => {
  const url = buildApiUrl("matchLink", baseUrl);
  if (url === null) return null;

  let referrer: string | null = null;
  try {
    referrer = await Application.getInstallReferrerAsync();
  } catch {
    referrer = null;
  }

  const decodedReferrer = decodeURIComponent(referrer ?? "");
  const matchClickId = decodedReferrer.match(/(?:^|&)click_id=([^&]+)/);
  const referrerClickId = matchClickId ? matchClickId[1] : null;

  let response;
  if (referrerClickId?.length) {
    response = await sendMatchRequest({
      url,
      API_KEY,
      appID,
      requestBody: buildDirectMatchRequest(referrerClickId),
    });
  } else {
    const signalMatchRequest = await buildSignalMatchRequest(shouldUseClipboard);

    response = await sendMatchRequest({
      url,
      API_KEY,
      appID,
      requestBody: signalMatchRequest,
    });
  }

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
