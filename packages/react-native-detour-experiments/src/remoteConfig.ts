import type { JsonObject } from "./runtime/declarations";
import type { ExperimentKey, FlagKey, Variant } from "./types";

/**
 * One experiment or flag as the dashboard serves it. Both have the same shape:
 * a flag's A is the flag off.
 */
export type RemoteRule = {
  status: "running" | "paused" | "completed";
  /** False while paused: everyone is held on A. */
  enabled: boolean;
  /** The share of devices enrolled, 0 to 100. The rest are held on A and send no exposure. */
  rolloutPercent: number;
  variants: Variant[];
  /** How the enrolled are split, A included. Absent, an experiment splits evenly and a flag leaves A out. */
  variantWeights?: Record<Variant, number>;
  /** Once completed, the variant every user gets. */
  winner: Variant | null;
  /** Per variant, in place of the declaration's payload for that variant. */
  payloads?: Record<Variant, JsonObject>;
  /**
   * A list of `AudienceCondition` a device must all match, or it is held on A. Kept as it arrived:
   * `matchesAudience` keeps the device out of a rule it cannot read, so the other rules survive.
   */
  audience?: unknown;
};

export type RemoteConfigPayload = {
  /** Raised by the dashboard on every change to the App's rules. The cache keeps the higher one. */
  version: number;
  /** For people reading the payload; nothing is decided from it. */
  updatedAt: string;
  experiments: Record<ExperimentKey, RemoteRule>;
  flags: Record<FlagKey, RemoteRule>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a value has what assignment reads of a rule. A rule is applied in a render, so one in
 * another shape, such as a config an older build cached, is refused here.
 */
function isRemoteRule(value: unknown): value is RemoteRule {
  if (!isRecord(value)) return false;
  const { enabled, rolloutPercent, variants, variantWeights, winner } = value;
  return (
    typeof enabled === "boolean" &&
    typeof rolloutPercent === "number" &&
    Number.isFinite(rolloutPercent) &&
    Array.isArray(variants) &&
    variants.length > 0 &&
    variants.every((variant) => typeof variant === "string") &&
    (variantWeights === undefined || isRecord(variantWeights)) &&
    (winner === null || typeof winner === "string")
  );
}

function isRuleMap(value: unknown): value is Record<string, RemoteRule> {
  return isRecord(value) && Object.values(value).every(isRemoteRule);
}

function isRemoteConfigPayload(value: unknown): value is RemoteConfigPayload {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value["version"] === "number" &&
    isRuleMap(value["experiments"]) &&
    isRuleMap(value["flags"])
  );
}

/** The payload as typed, or `null` when it is not a remote config in today's shape. */
export function parseRemoteConfigPayload(value: unknown): RemoteConfigPayload | null {
  if (!isRemoteConfigPayload(value)) {
    return null;
  }
  return value;
}
