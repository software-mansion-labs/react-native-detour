const UTM_PARAMS = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
  term: "utm_term",
} as const;

// getInstallReferrerAsync returns only the referrer string, so the click and install
// timestamps that the native Android SDK sends are missing here.
export type InstallReferrer = {
  raw: string;
  utm?: Partial<Record<keyof typeof UTM_PARAMS, string>>;
  gclid?: string;
};

/**
 * Decodes the referrer once and splits it into parameters. The first value of a repeated key
 * wins; empty values are left out. Values are kept as they are, so a gclid keeps its case.
 */
const parseReferrerParams = (raw: string): Map<string, string> => {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    console.warn(
      "🔗[Detour:WARNING] Install referrer is not URL-encoded correctly; parsing it as is",
    );
  }

  const params = new Map<string, string>();
  for (const param of decoded.split("&")) {
    const [, key, value] = param.match(/^([^=]+)=(.+)$/) ?? [];
    if (key && value && !params.has(key)) params.set(key, value);
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

  return {
    clickId: params.get("click_id") ?? null,
    installReferrer: {
      raw,
      ...(Object.keys(utm).length > 0 && { utm }),
      ...(gclid !== undefined && { gclid }),
    },
  };
};
