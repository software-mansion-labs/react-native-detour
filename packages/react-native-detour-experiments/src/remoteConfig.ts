import type { JsonObject } from "./runtime/declarations";
import type { ExperimentKey, FlagKey, Variant } from "./types";

export type RemoteRule = {
  status: "running" | "paused" | "completed";
  enabled: boolean;
  rolloutPercent: number;
  variants: Variant[];
  variantWeights?: Record<Variant, number>;
  winner: Variant | null;
  payloads?: Record<Variant, JsonObject>;
  // Kept as it arrived: `matchesAudience` keeps a device out of a rule it cannot read, so other rules survive.
  audience?: unknown;
};

export type RemoteConfigPayload = {
  version: number;
  updatedAt: string;
  experiments: Record<ExperimentKey, RemoteRule>;
  flags: Record<FlagKey, RemoteRule>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export function parseRemoteConfigPayload(value: unknown): RemoteConfigPayload | null {
  if (!isRecord(value)) return null;
  const valid =
    typeof value["version"] === "number" &&
    isRuleMap(value["experiments"]) &&
    isRuleMap(value["flags"]);
  return valid ? (value as RemoteConfigPayload) : null;
}
