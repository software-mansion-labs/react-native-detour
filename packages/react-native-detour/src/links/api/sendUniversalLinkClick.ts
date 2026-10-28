import { Platform } from "react-native";

import Constants from "expo-constants";

import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";
import { getSyncDeviceInfo } from "../utils/deviceInfo";
import { normalizeRawLink } from "../utils/urlHelpers";

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

export type ClickSource = "provider" | "native-intent";

export type UniversalLinkClickResult = (
  | { allowed: true; clickId: string | null }
  | {
      allowed: false;
      error: string;
      code?: string;
      clicksInPeriod?: number;
      effectiveLimit?: number;
    }
) & {
  /**
   * Set when the same URL was sent less than 10 s ago. No request is made then,
   * and the result of the earlier request is reused.
   */
  repeatOf?: { source: ClickSource; elapsedMs: number };
};

type ClickRequest = Pick<RequiredConfig, "apiKey" | "appID"> & {
  url: string;
};

type SentClick = {
  result: Promise<UniversalLinkClickResult>;
  source: ClickSource;
  sentAt: number;
};

// One open can reach the SDK twice: from the Expo Router native intent and from
// DetourProvider, or as two `url` events on iOS. It must be sent as one click.
const sentClicks = new Map<string, SentClick>();

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

const toClickKey = (url: string) => {
  try {
    return new URL(normalizeRawLink(url)).toString();
  } catch {
    return url;
  }
};

const forgetExpiredClicks = (now: number) => {
  for (const [key, click] of sentClicks) {
    if (now - click.sentAt >= REPEAT_WINDOW_MS) {
      sentClicks.delete(key);
    }
  }
};

const postUniversalLinkClick = async ({
  apiKey: API_KEY,
  appID,
  url,
}: ClickRequest): Promise<UniversalLinkClickResult> => {
  try {
    const params = extractParams(url);
    const metadata = buildMetadata();

    const response = await fetch(API_URL, {
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

export const sendUniversalLinkClick = ({
  source,
  ...request
}: ClickRequest & { source: ClickSource }): Promise<UniversalLinkClickResult> => {
  const now = Date.now();
  forgetExpiredClicks(now);

  const key = toClickKey(request.url);
  const earlierClick = sentClicks.get(key);
  if (earlierClick) {
    const repeatOf = { source: earlierClick.source, elapsedMs: now - earlierClick.sentAt };
    return earlierClick.result.then((result) => ({ ...result, repeatOf }));
  }

  const result = postUniversalLinkClick(request);
  sentClicks.set(key, { result, source, sentAt: now });
  return result;
};
