import { attributionMatchFieldsFor } from "../../attribution/attributionMode";
import type { DeviceIdentifiers } from "../../attribution/deviceIdentifiers";
import { sendLateMetaReferrer } from "../../attribution/lateMetaReferrer";
import { sdkPackageForRequest } from "../../attribution/sdkPackage";
import type { DetourAttributionMatchFields } from "../../attribution/types";
import { identityFields } from "../../identity/requestIdentity";
import { detourFetch } from "../../net/client";
import { buildApiUrl } from "../../net/endpoints";
import { readApiError } from "../../net/errorBody";
import { getRequestContext } from "../../net/requestContext";
import type { SdkPackage } from "../../net/types";
import { createSignal } from "../../utils/signal";
import type { RequiredConfig } from "../types";
import type { MatchContext } from "../types/matchContext";
import { readInstallReferrer } from "../utils/installReferrer";
import { buildDirectMatchRequest, buildSignalMatchRequest } from "../utils/matchSignals";

type MatchParams = Pick<RequiredConfig, "apiKey" | "appID" | "shouldUseClipboard" | "baseUrl"> & {
  deviceId: string;
  userId: string | null;
  /** With the SDK off only a click ID from the referrer matches, with the v1 body only. */
  isEnabled?: boolean;
};

type MatchAttribution = {
  sdkPackage: SdkPackage;
  fields: DetourAttributionMatchFields & DeviceIdentifiers;
};

// Returns null when no request is sent: the SDK is off and the referrer has no click ID.
const requestMatch = async (
  { apiKey, appID, shouldUseClipboard, baseUrl, deviceId, userId, isEnabled = true }: MatchParams,
  attribution: Promise<MatchAttribution>,
): Promise<Response | null> => {
  const parsedReferrer = await readInstallReferrer();
  const referrerClickId = parsedReferrer?.clickId ?? null;

  if (!isEnabled && referrerClickId === null) return null;

  // Awaited into variables before the body is built: Hermes (RN 0.85) sent `...(await x)` inside
  // a ternary as `0`.
  const [matchRequest, requestContext, { sdkPackage, fields }] = await Promise.all([
    referrerClickId !== null
      ? buildDirectMatchRequest(referrerClickId)
      : buildSignalMatchRequest(shouldUseClipboard),
    isEnabled ? getRequestContext({ forMatchLink: true }) : null,
    attribution,
  ]);

  // The referrer goes with both match requests: an install from an ad without a Detour click ID
  // still reports its gclid.
  const matchContext: MatchContext = {
    ...identityFields(deviceId, userId),
    ...(parsedReferrer && { install_referrer: parsedReferrer.installReferrer }),
    ...fields,
  };

  return detourFetch("matchLink", {
    config: { apiKey, appID, baseUrl },
    body: requestContext ? { ...requestContext, ...matchRequest, ...matchContext } : matchRequest,
    headers: { "X-SDK-Package": sdkPackage },
    retries: 1,
  });
};

export const getDeferredLink = async (params: MatchParams) => {
  // Checked before the referrer and clipboard are read, so nothing is collected for a request
  // that will not be sent.
  if (buildApiUrl("matchLink", params.baseUrl) === null) return null;

  // Started first, so the fields are read in parallel with the referrer, the signals and the
  // request context. The header and the fields use the same package; with the SDK off it is
  // `core`, so nothing is read.
  const matchEnded = createSignal();
  const attribution = sdkPackageForRequest().then(async (sdkPackage) => ({
    sdkPackage,
    fields: await attributionMatchFieldsFor(sdkPackage, (referrer) =>
      sendLateMetaReferrer(params.deviceId, referrer, matchEnded.done),
    ),
  }));

  // Every exit ends the match, so a late Meta referrer read meanwhile does not wait forever.
  const response = await requestMatch(params, attribution).finally(() => matchEnded.resolve());
  return response === null ? null : readMatchedLink(response);
};

const readMatchedLink = async (response: Response): Promise<string | null> => {
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
