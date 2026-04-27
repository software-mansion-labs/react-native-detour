import { SDK_HEADER_VALUE } from "../../version";
import type { RequiredConfig } from "../types";

const API_URL = "https://godetour.dev/api/link/click-limit";

type ClickLimitResponseBody = {
  allowed?: boolean;
  error?: string;
  code?: string;
  clicksInPeriod?: number;
  effectiveLimit?: number;
};

export type ClickLimitCheckResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      status: number;
      error: string;
      code?: string;
      clicksInPeriod?: number;
      effectiveLimit?: number;
    };

const getFallbackErrorMessage = (status: number) => {
  if (status === 402) {
    return "Click limit exceeded";
  }
  return "Click limit check failed";
};

export const checkClickLimit = async ({
  apiKey: API_KEY,
  appID,
}: Pick<RequiredConfig, "apiKey" | "appID">): Promise<ClickLimitCheckResult> => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
    });

    let body: ClickLimitResponseBody | null = null;
    try {
      body = (await response.json()) as ClickLimitResponseBody;
    } catch {
      body = null;
    }

    const isExplicitDeny = body?.allowed === false || response.status === 402;
    if (isExplicitDeny) {
      return {
        allowed: false,
        status: response.status,
        error: body?.error || getFallbackErrorMessage(response.status),
        code: body?.code,
        clicksInPeriod: body?.clicksInPeriod,
        effectiveLimit: body?.effectiveLimit,
      };
    }

    if (!response.ok) {
      // Fail-open for temporary backend/network issues so apps keep working.
      return { allowed: true };
    }

    return { allowed: true };
  } catch {
    // Fail-open on transport errors; limit enforcement only happens on explicit deny.
    return { allowed: true };
  }
};
