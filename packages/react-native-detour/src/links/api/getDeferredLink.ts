import { identityFields } from "../../identity/requestIdentity";
import { detourFetch } from "../../net/client";
import { buildApiUrl } from "../../net/endpoints";
import { readApiError } from "../../net/errorBody";
import { getRequestContext } from "../../net/requestContext";
import type { RequiredConfig } from "../types";
import type { MatchContext } from "../types/matchContext";
import { readInstallReferrer } from "../utils/installReferrer";
import { buildDirectMatchRequest, buildSignalMatchRequest } from "../utils/matchSignals";

export const getDeferredLink = async ({
  apiKey: API_KEY,
  appID,
  shouldUseClipboard,
  baseUrl,
  deviceId,
  userId,
  isEnabled = true,
}: Pick<RequiredConfig, "apiKey" | "appID" | "shouldUseClipboard" | "baseUrl"> & {
  deviceId: string;
  userId: string | null;
  /** With the SDK off only a click ID from the referrer matches, with the v1 body only. */
  isEnabled?: boolean;
}) => {
  // Checked before the referrer and clipboard are read, so nothing is collected for a request
  // that will not be sent.
  if (buildApiUrl("matchLink", baseUrl) === null) return null;

  const parsedReferrer = await readInstallReferrer();
  const referrerClickId = parsedReferrer?.clickId ?? null;

  // The referrer goes with both match requests: an install from an ad without a Detour click ID
  // still reports its gclid.
  const matchContext: MatchContext = {
    ...identityFields(deviceId, userId),
    ...(parsedReferrer && { install_referrer: parsedReferrer.installReferrer }),
  };

  if (!isEnabled && referrerClickId === null) return null;

  const matchRequest =
    referrerClickId !== null
      ? buildDirectMatchRequest(referrerClickId)
      : await buildSignalMatchRequest(shouldUseClipboard);

  const response = await detourFetch("matchLink", {
    config: { apiKey: API_KEY, appID, baseUrl },
    body: isEnabled
      ? { ...(await getRequestContext({ forMatchLink: true })), ...matchRequest, ...matchContext }
      : matchRequest,
    retries: 1,
  });
  if (response === null) return null;

  try {
    if (!response.ok) {
      if (response.status === 404) {
        console.warn("🔗[Detour:WARNING] No matching deferred link found");
        return null;
      }

      throw new Error(`[${response.status}] ${await readApiError(response)}`);
    }

    const data = await response.json();
    return data.link || null;
  } catch (error) {
    console.error("🔗[Detour:NETWORK_ERROR] Error fetching deferred link:", error);
    return null;
  }
};
