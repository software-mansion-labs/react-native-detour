import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";

const API_URL = "https://godetour.dev/api/link/universal-link-click";

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

export const sendUniversalLinkClick = async ({
  apiKey: API_KEY,
  appID,
  url,
}: Pick<RequiredConfig, "apiKey" | "appID"> & {
  url: string;
}): Promise<UniversalLinkClickResult> => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({ url, timestamp: Date.now() }),
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
