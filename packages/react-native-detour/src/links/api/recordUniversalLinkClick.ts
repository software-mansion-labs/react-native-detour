import { Platform } from "react-native";

import Constants from "expo-constants";

import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";
import { getSyncDeviceInfo } from "../utils/deviceInfo";
import { createLinkRegistry } from "../utils/linkRegistry";

const API_URL = "https://godetour.dev/api/link/universal-link-click";
// Matches the server, which also ignores a repeated click on the same link within 10 s.
const REPEAT_WINDOW_MS = 10_000;

type UniversalLinkClickResponseBody = {
  allowed?: boolean;
  error?: string;
  code?: string;
  clicksInPeriod?: number;
  effectiveLimit?: number;
  remainingClicks?: number;
  clickId?: string | null;
};

export type UniversalLinkClickResult =
  | { allowed: true; clickId: string | null }
  | {
      allowed: false;
      error: string;
      code?: string;
      clicksInPeriod?: number;
      effectiveLimit?: number;
    };

type DeniedClick = Extract<UniversalLinkClickResult, { allowed: false }>;

// Apps keep working when the click cannot be saved. Limits apply only on an explicit deny.
const FAIL_OPEN_RESULT: UniversalLinkClickResult = { allowed: true, clickId: null };

type ClickRequest = Pick<RequiredConfig, "apiKey" | "appID"> & {
  url: string;
};

// One open can reach the SDK twice: from the Expo Router native intent and from
// DetourProvider, or as two `url` events on iOS. It must be sent as one click.
const recordedClicks = createLinkRegistry<Promise<UniversalLinkClickResult>>(REPEAT_WINDOW_MS);

type ClickPlatform = "ios" | "android" | "unknown";

const resolvePlatform = (): ClickPlatform =>
  Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown";

const extractParams = (url: string): Record<string, string> | undefined => {
  try {
    const { searchParams } = new URL(url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return Object.keys(params).length > 0 ? params : undefined;
  } catch {
    return undefined;
  }
};

const buildMetadata = (): Record<string, string> => {
  const { model, osVersion } = getSyncDeviceInfo();

  const raw: Record<string, string | null | undefined> = {
    os_version: osVersion,
    app_version: Constants.nativeAppVersion,
    device_model: model,
  };

  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
};

// Resolves to null when the click was not saved, so it can be sent again.
const postUniversalLinkClick = async ({
  apiKey: API_KEY,
  appID,
  url,
}: ClickRequest): Promise<UniversalLinkClickResult | null> => {
  let response: Response;
  try {
    const params = extractParams(url);
    const metadata = buildMetadata();

    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({
        url,
        timestamp: Date.now(),
        platform: resolvePlatform(),
        ...(params !== undefined && { params }),
        ...(Object.keys(metadata).length > 0 && { metadata }),
      }),
    });
  } catch (error) {
    // Also reached when no device info library is installed, because buildMetadata throws then.
    console.warn("🔗[Detour] Universal link click not sent:", error);
    return null;
  }

  let body: UniversalLinkClickResponseBody | null = null;
  try {
    body = (await response.json()) as UniversalLinkClickResponseBody;
  } catch {
    body = null;
  }

  const isExplicitDeny = body?.allowed === false || response.status === 402;
  if (isExplicitDeny) {
    return {
      allowed: false,
      error: body?.error ?? "Click limit exceeded",
      code: body?.code,
      clicksInPeriod: body?.clicksInPeriod,
      effectiveLimit: body?.effectiveLimit,
    };
  }

  if (!response.ok) {
    console.warn("🔗[Detour] Universal link click not saved, status:", response.status);
    return null;
  }

  return { allowed: true, clickId: body?.clickId ?? null };
};

/**
 * Saves one click per link open. Calls for the same link within `REPEAT_WINDOW_MS` make no
 * new request and get the result of the first one.
 */
export const recordUniversalLinkClick = (
  request: ClickRequest,
): Promise<UniversalLinkClickResult> => {
  // Not async on purpose: the click is stored before the first await,
  // so two calls in the same tick share one request.
  const earlierClick = recordedClicks.get(request.url);
  if (earlierClick) {
    return earlierClick.value;
  }

  const pendingResult: Promise<UniversalLinkClickResult> = postUniversalLinkClick(request).then(
    (result) => {
      if (result) {
        return result;
      }
      // The click was not saved, so the next call for this link sends it again.
      recordedClicks.forget(request.url, pendingResult);
      return FAIL_OPEN_RESULT;
    },
  );
  recordedClicks.set(request.url, pendingResult);
  return pendingResult;
};

export const logClickLimitError = (
  message: string,
  link: { url: string } | { path: string },
  { error, code, clicksInPeriod, effectiveLimit }: DeniedClick,
) => {
  console.error(`🔗[Detour:CLICK_LIMIT_ERROR] ${message}`, {
    ...link,
    error,
    code,
    clicksInPeriod,
    effectiveLimit,
  });
};

/** Lets tests start from a clean state. */
export const forgetRecordedClicks = () => recordedClicks.clear();
