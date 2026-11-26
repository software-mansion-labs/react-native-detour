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
  // Not validated here. `matchesAudience` rejects an audience it cannot read, so one bad
  // audience does not drop the other rules.
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

// A rule that cannot be read is left out, so one bad rule does not block every other rule.
// Its experiment or flag then stays on control, as if it had no rule.
function readRules(value: unknown): Record<string, RemoteRule> | null {
  if (!isRecord(value)) return null;
  const rules: Record<string, RemoteRule> = {};
  for (const [key, rule] of Object.entries(value)) {
    if (isRemoteRule(rule)) rules[key] = rule;
  }
  return rules;
}

export function parseRemoteConfigPayload(value: unknown): RemoteConfigPayload | null {
  if (!isRecord(value) || typeof value["version"] !== "number") return null;
  const experiments = readRules(value["experiments"]);
  const flags = readRules(value["flags"]);
  if (!experiments || !flags) return null;
  return { ...value, experiments, flags } as unknown as RemoteConfigPayload;
}
