import { attributionMatchFieldsFor } from "../../attribution/attributionMode";
import { sendLateMetaReferrer } from "../../attribution/lateMetaReferrer";
import { sdkPackageForRequest } from "../../attribution/sdkPackage";
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

  // Started first, so the fields are read in parallel with the referrer, the signals and the
  // request context. The header and the fields use the same package; with the SDK off it is
  // `core`, so nothing is read.
  let markMatchEnded = () => {};
  const matchEnded = new Promise<void>((resolve) => {
    markMatchEnded = resolve;
  });
  const attribution = sdkPackageForRequest().then(async (sdkPackage) => ({
    sdkPackage,
    fields: await attributionMatchFieldsFor(sdkPackage, (referrer) =>
      sendLateMetaReferrer(deviceId, referrer, matchEnded),
    ),
  }));

  let response: Response | null;
  // Every exit ends the match, so a late Meta referrer read meanwhile does not wait forever.
  try {
    const parsedReferrer = await readInstallReferrer();
    const referrerClickId = parsedReferrer?.clickId ?? null;

    if (!isEnabled && referrerClickId === null) return null;

    // Awaited into variables before the body is built: Hermes (RN 0.85) sent `...(await x)`
    // inside a ternary as `0`.
    const [matchRequest, requestContext, { sdkPackage, fields }] = await Promise.all([
      referrerClickId !== null
        ? buildDirectMatchRequest(referrerClickId)
        : buildSignalMatchRequest(shouldUseClipboard),
      isEnabled ? getRequestContext({ forMatchLink: true }) : null,
      attribution,
    ]);

    // The referrer goes with both match requests: an install from an ad without a Detour click
    // ID still reports its gclid.
    const matchContext: MatchContext = {
      ...identityFields(deviceId, userId),
      ...(parsedReferrer && { install_referrer: parsedReferrer.installReferrer }),
      ...fields,
    };

    response = await detourFetch("matchLink", {
      config: { apiKey: API_KEY, appID, baseUrl },
      body: requestContext ? { ...requestContext, ...matchRequest, ...matchContext } : matchRequest,
      headers: { "X-SDK-Package": sdkPackage },
      retries: 1,
    });
  } finally {
    markMatchEnded();
  }
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
