import type { RemoteConfigPayload, RemoteRule } from "../remoteConfig";
import type { AssignmentSource, ExperimentKey, Variant, VariantOverrides } from "../types";
import { matchesAudience } from "./audience";
import type { DeviceAttributes } from "./deviceAttributes";
import { warnOnceInDev } from "./environment";
import { bucketToMultiVariant, getBucket, getEnrollmentBucket } from "./murmurhash3";

export type ResolvedAssignment = {
  variant: Variant;
  source: AssignmentSource;
};

export type ResolveAssignmentOptions = {
  deviceId: string | null;
  experimentKey: ExperimentKey;
  variants?: readonly Variant[] | undefined;
  overrides?: Record<string, string> | undefined;
  forcedVariants?: VariantOverrides | undefined;
  remoteConfig?: RemoteConfigPayload | null | undefined;
  attributes?: DeviceAttributes | undefined;
};

export type RuleKind = "experiment" | "flag";

type SplitRule = Pick<RemoteRule, "variants" | "variantWeights">;

function controlVariant(variants?: readonly Variant[]): Variant {
  if (!variants || variants.length === 0 || variants.includes("A")) return "A";
  return variants[0]!;
}

// A rule without weights splits evenly: an experiment over every variant, a flag over all but A.
// The dashboard's `splitWeights` is a copy.
export function ruleWeights(rule: SplitRule, kind: RuleKind): Record<Variant, number> {
  const weights = rule.variantWeights;
  if (weights && rule.variants.some((variant) => (weights[variant] ?? 0) > 0)) {
    return weights;
  }
  return Object.fromEntries(
    rule.variants.map((variant) => [variant, kind === "flag" && variant === "A" ? 0 : 1]),
  );
}

export function bucketVariant(bucket: number, rule: SplitRule, kind: RuleKind): Variant {
  return bucketToMultiVariant(bucket, rule.variants, ruleWeights(rule, kind));
}

// Drawn apart from the arm, so raising the rollout moves nobody.
export function isEnrolled(
  deviceId: string,
  key: string,
  rule: Pick<RemoteRule, "rolloutPercent">,
): boolean {
  return getEnrollmentBucket(deviceId, key) < rule.rolloutPercent;
}

// The winner comes before the audience: every device gets it.
export function applyRemoteRule(
  deviceId: string | null,
  key: string,
  rule: RemoteRule,
  {
    kind,
    held,
    undecided,
    attributes = {},
  }: {
    kind: RuleKind;
    held: Variant;
    undecided: Variant;
    attributes?: DeviceAttributes | undefined;
  },
): ResolvedAssignment {
  if (rule.winner) {
    return { variant: rule.winner, source: "remoteWinner" };
  }

  if (!rule.enabled) {
    return { variant: held, source: "paused" };
  }

  if (!matchesAudience(rule.audience, attributes)) {
    return { variant: held, source: "untargeted" };
  }

  if (deviceId === null) {
    return { variant: undecided, source: "default" };
  }

  if (!isEnrolled(deviceId, key, rule)) {
    return { variant: held, source: "notEnrolled" };
  }

  return { variant: bucketVariant(getBucket(deviceId, key), rule, kind), source: "remote" };
}

// A variant added on the dashboard after the build shipped is held on control and logs no exposure.
export function holdUndeclared(
  key: string,
  assignment: ResolvedAssignment,
  variants: readonly Variant[] | undefined,
  control: Variant,
): ResolvedAssignment {
  if (!variants || variants.includes(assignment.variant)) return assignment;
  warnOnceInDev(
    `undeclared-variant:${key}`,
    `[Detour Experiments] "${key}" resolved to variant "${assignment.variant}", which this build does not declare ` +
      `(${variants.join(", ")}). It stays on ${control} and logs no exposure.`,
  );
  return { variant: control, source: "undeclared" };
}

// A forced variant comes from an untrusted deep link, so one the experiment never declared is ignored.
function decideAssignment({
  deviceId,
  experimentKey,
  variants,
  overrides = {},
  forcedVariants = {},
  remoteConfig = null,
  attributes,
}: ResolveAssignmentOptions): ResolvedAssignment {
  const forced = forcedVariants[experimentKey];
  if (forced && (!variants || variants.includes(forced))) {
    return { variant: forced, source: "devOverride" };
  }

  const override = overrides[experimentKey];
  if (typeof override === "string" && override) {
    return { variant: override, source: "devOverride" };
  }

  const remoteRule = remoteConfig?.experiments[experimentKey];
  if (remoteRule) {
    const control = controlVariant(variants ?? remoteRule.variants);
    return applyRemoteRule(deviceId, experimentKey, remoteRule, {
      kind: "experiment",
      held: control,
      undecided: control,
      attributes,
    });
  }

  return { variant: controlVariant(variants), source: "default" };
}

export function resolveAssignment(options: ResolveAssignmentOptions): ResolvedAssignment {
  const { experimentKey, variants } = options;
  return holdUndeclared(
    experimentKey,
    decideAssignment(options),
    variants,
    controlVariant(variants),
  );
}
