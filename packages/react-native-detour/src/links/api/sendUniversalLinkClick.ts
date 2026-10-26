import { Platform } from "react-native";

import Constants from "expo-constants";

import { buildApiUrl } from "../../net/endpoints";
import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";
import { getSyncDeviceInfo } from "../utils/deviceInfo";

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

export const sendUniversalLinkClick = async ({
  apiKey: API_KEY,
  appID,
  url,
  baseUrl,
}: Pick<RequiredConfig, "apiKey" | "appID" | "baseUrl"> & {
  url: string;
}): Promise<UniversalLinkClickResult> => {
  const endpoint = buildApiUrl("universalLinkClick", baseUrl);
  if (endpoint === null) return { allowed: true, clickId: null };

  try {
    const params = extractParams(url);
    const metadata = buildMetadata();

    const response = await fetch(endpoint, {
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
      // Fail-open for temporary backend/network issues so apps keep working.
      return { allowed: true, clickId: null };
    }

    return { allowed: true, clickId: body?.clickId ?? null };
  } catch {
    // Fail-open on transport errors; limit enforcement only happens on explicit deny.
    return { allowed: true, clickId: null };
  }
};
