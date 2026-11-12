import { Platform } from "react-native";

import * as Application from "expo-application";

import type { InstallReferrer } from "../types/matchContext";

const UTM_PARAMS = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
  term: "utm_term",
} as const satisfies Record<keyof NonNullable<InstallReferrer["utm"]>, string>;

// The backend matches only UUID click IDs. Older Detour links sent `click_id=null`, and other
// tools use their own IDs; those installs go to signal matching instead.
const CLICK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Transient: no connection to the Play Store app. The same code covers a few other errors,
// where one more try does no harm.
const RETRIED_ERROR_CODES = new Set([
  "ERR_APPLICATION_INSTALL_REFERRER",
  "ERR_APPLICATION_INSTALL_REFERRER_SERVICE_DISCONNECTED",
]);
const RETRY_DELAY_MS = 1_000;

// A referrer encoded twice has no `=` of its own, only `%3D`.
const unwrapDoubleEncoding = (raw: string): string => {
  if (raw.includes("=") || !/%3d/i.test(raw)) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/**
 * Splits the referrer into parameters, then decodes each key and value, so an encoded `&` or `=`
 * stays inside its value. The first value of a repeated key wins; empty values are left out.
 * Values keep their case, so a gclid keeps it.
 */
const parseReferrerParams = (raw: string): Map<string, string> => {
  let hasBadEncoding = false;
  // `+` is a space in a query string, as Android's URLDecoder reads it.
  const decode = (part: string) => {
    try {
      return decodeURIComponent(part.replace(/\+/g, " "));
    } catch {
      hasBadEncoding = true;
      return part;
    }
  };

  const params = new Map<string, string>();
  for (const param of unwrapDoubleEncoding(raw).replace(/^\?/, "").split("&")) {
    const separator = param.indexOf("=");
    if (separator <= 0) continue;
    const key = decode(param.slice(0, separator));
    const value = decode(param.slice(separator + 1));
    if (key && value && !params.has(key)) params.set(key, value);
  }
  if (hasBadEncoding) {
    console.warn(
      "🔗[Detour:WARNING] Install referrer is not URL-encoded correctly; parsing the bad parts as they are",
    );
  }
  return params;
};

export const parseInstallReferrer = (
  raw: string,
): { clickId: string | null; installReferrer: InstallReferrer } => {
  const params = parseReferrerParams(raw);

  const utm: InstallReferrer["utm"] = {};
  for (const [field, param] of Object.entries(UTM_PARAMS) as [keyof typeof UTM_PARAMS, string][]) {
    const value = params.get(param);
    if (value !== undefined) utm[field] = value;
  }
  const gclid = params.get("gclid");
  const clickId = params.get("click_id");

  return {
    clickId: clickId !== undefined && CLICK_ID_PATTERN.test(clickId) ? clickId : null,
    installReferrer: {
      raw,
      ...(Object.keys(utm).length > 0 && { utm }),
      ...(gclid !== undefined && { gclid }),
    },
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchReferrer = async (): Promise<string | null> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await Application.getInstallReferrerAsync();
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (attempt === 0 && typeof code === "string" && RETRIED_ERROR_CODES.has(code)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.warn(
        "🔗[Detour:WARNING] Could not read the install referrer; matching without it.",
        error,
      );
      return null;
    }
  }
};

/** The Google Play install referrer, parsed; `null` outside Android or when it is not available. */
export const readInstallReferrer = async () => {
  if (Platform.OS !== "android") return null;
  const raw = await fetchReferrer();
  return raw?.trim() ? parseInstallReferrer(raw) : null;
};
