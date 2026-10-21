import type { DeviceAttributes } from "./deviceAttributes";

/**
 * One condition of an audience as the dashboard serves it. `attribute` and `operator` are typed as text
 * because a newer dashboard may send one this build has never heard of.
 */
export type AudienceCondition = {
  attribute: string;
  operator: string;
  values: string[];
};

/** The attributes whose values are versions: `2.3` is `2.3.0` on them. */
function isVersionAttribute(attribute: string): boolean {
  return attribute === "appVersion" || attribute === "osVersion";
}

/** `2.3.0` as `[2, 3, 0]`; null when a part is not a whole number. */
function versionParts(version: string): number[] | null {
  const parts = version.split(".");
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  return parts.map(Number);
}

/**
 * Below 0 when `a` is the older, 0 when they are the same, above 0 when `a` is the newer.
 * A missing part is 0. Null when either has a part that is not a number, such as `2.3-beta`.
 */
export function compareVersions(a: string, b: string): number | null {
  const [x, y] = [versionParts(a), versionParts(b)];
  if (!x || !y) return null;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const difference = (x[i] ?? 0) - (y[i] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

/** `pl` for both `pl-PL` and `pl_PL`: a locale is compared by its language. */
function languageOf(locale: string): string {
  return locale.split(/[-_]/)[0]!.toLowerCase();
}

/** The device's value for an attribute; undefined when it has none, or the attribute is not one of ours. */
function deviceValue(attribute: string, attributes: DeviceAttributes): string | undefined {
  switch (attribute) {
    case "platform":
    case "appVersion":
    case "osVersion":
    case "locale":
    case "channel":
    case "runtimeVersion": {
      const value: unknown = attributes[attribute];
      return typeof value === "string" && value !== "" ? value : undefined;
    }
    case "bundle":
      if (typeof attributes.isEmbedded !== "boolean") return undefined;
      return attributes.isEmbedded ? "embedded" : "update";
    default:
      return undefined;
  }
}

function sameValue(attribute: string, device: string, value: string): boolean {
  if (attribute === "locale") return languageOf(device) === languageOf(value);
  if (isVersionAttribute(attribute)) return compareVersions(device, value) === 0;
  return device === value;
}

function isCondition(value: unknown): value is AudienceCondition {
  if (typeof value !== "object" || value === null) return false;
  const { attribute, operator, values } = value as Record<string, unknown>;
  return (
    typeof attribute === "string" &&
    typeof operator === "string" &&
    Array.isArray(values) &&
    values.every((item) => typeof item === "string")
  );
}

/** A device with no value for the attribute, or a version that is not numbers, fails `is_not` too. */
function matchesCondition(condition: AudienceCondition, attributes: DeviceAttributes): boolean {
  const { attribute, operator, values } = condition;
  const device = deviceValue(attribute, attributes);
  if (device === undefined || values.length === 0) return false;
  if (isVersionAttribute(attribute) && versionParts(device) === null) return false;

  switch (operator) {
    case "is":
      return values.some((value) => sameValue(attribute, device, value));
    case "is_not":
      return !values.some((value) => sameValue(attribute, device, value));
    case "at_least":
    case "below": {
      if (!isVersionAttribute(attribute) || values.length !== 1) return false;
      const order = compareVersions(device, values[0]!);
      if (order === null) return false;
      return operator === "at_least" ? order >= 0 : order < 0;
    }
    default:
      return false;
  }
}

/**
 * Every condition must match, and whatever this build cannot read keeps the device out.
 * The dashboard follows the same rules: both repos test `__tests__/fixtures/audience-vectors.json`.
 */
export function matchesAudience(audience: unknown, attributes: DeviceAttributes): boolean {
  if (audience === undefined || audience === null) return true;
  if (!Array.isArray(audience)) return false;
  return audience.every(
    (condition) => isCondition(condition) && matchesCondition(condition, attributes),
  );
}
