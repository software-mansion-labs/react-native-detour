import type { RemoteConfigPayload, RemoteRule } from "../remoteConfig";
import type { AssignmentSource, ExperimentKey, Variant, VariantOverrides } from "../types";
import { matchesAudience } from "./audience";
import type { DeviceAttributes } from "./deviceAttributes";
import { bucketToMultiVariant, getBucket, getEnrollmentBucket } from "./murmurhash3";

declare const __DEV__: boolean | undefined;

export type ResolvedAssignment = {
  variant: Variant;
  source: AssignmentSource;
};

export type ResolveAssignmentOptions = {
  /**
   * What the bucket is hashed from. `null` while the id is not known yet,
   * which holds anything that needs a bucket on control.
   */
  deviceId: string | null;
  experimentKey: ExperimentKey;
  variants?: readonly Variant[] | undefined;
  /** The provider's overrides: a variant per key. */
  overrides?: Record<string, string> | undefined;
  /**
   * Variants pinned by screenshot capture's `detour_experiments_force` deep link. Read
   * first, so capture photographs the arm it asked for whatever else is set.
   */
  forcedVariants?: VariantOverrides | undefined;
  remoteConfig?: RemoteConfigPayload | null | undefined;
  /**
   * What the device knows about itself, as read when the launch started. A
   * rule's audience is matched against it; without it no audience matches.
   */
  attributes?: DeviceAttributes | undefined;
};

/** Where a user sits when nothing puts them in an arm: `A`, or the first arm of an experiment without one. */
function controlVariant(variants?: readonly Variant[]): Variant {
  if (!variants || variants.length === 0 || variants.includes("A")) return "A";
  return variants[0]!;
}

/** Which map of the remote config a rule is in. It decides the split of a rule without weights. */
export type RuleKind = "experiment" | "flag";

type SplitRule = Pick<RemoteRule, "variants" | "variantWeights">;

/**
 * The weights the enrolled are split by. A rule without any splits them evenly: an experiment over
 * every variant, a flag over every variant but A. The dashboard's `splitWeights` is a copy.
 */
export function ruleWeights(rule: SplitRule, kind: RuleKind): Record<Variant, number> {
  const weights = rule.variantWeights;
  if (weights && rule.variants.some((variant) => (weights[variant] ?? 0) > 0)) {
    return weights;
  }
  return Object.fromEntries(
    rule.variants.map((variant) => [variant, kind === "flag" && variant === "A" ? 0 : 1]),
  );
}

/** The variant an enrolled device in `bucket` (0 to 99) gets. `detour-experiments mock` deals by it too. */
export function bucketVariant(bucket: number, rule: SplitRule, kind: RuleKind): Variant {
  return bucketToMultiVariant(bucket, rule.variants, ruleWeights(rule, kind));
}

/** Whether the rollout enrolls the device. Drawn apart from the arm, so raising it moves nobody. */
export function isEnrolled(
  deviceId: string,
  key: string,
  rule: Pick<RemoteRule, "rolloutPercent">,
): boolean {
  return getEnrollmentBucket(deviceId, key) < rule.rolloutPercent;
}

/**
 * One device under one remote rule. The Winner comes before the audience: every device gets it.
 * `held` is for a device the rule does not split, `undecided` for one with no id to bucket by.
 */
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

const warnedUndeclared = new Set<string>();

function warnUndeclaredOnce(
  key: string,
  variant: Variant,
  variants: readonly Variant[],
  control: Variant,
): void {
  if (typeof __DEV__ === "undefined" || !__DEV__ || warnedUndeclared.has(key)) return;
  warnedUndeclared.add(key);
  console.warn(
    `[Detour Experiments] "${key}" resolved to variant "${variant}", which this build does not declare ` +
      `(${variants.join(", ")}). It stays on ${control} and logs no exposure.`,
  );
}

/**
 * Holds the device on `control` when `assignment` names a variant the build does not declare, such as one
 * added on the dashboard after it shipped. Warns once per key in development; it is not an exposure.
 */
export function holdUndeclared(
  key: string,
  assignment: ResolvedAssignment,
  variants: readonly Variant[] | undefined,
  control: Variant,
): ResolvedAssignment {
  if (!variants || variants.includes(assignment.variant)) return assignment;
  warnUndeclaredOnce(key, assignment.variant, variants, control);
  return { variant: control, source: "undeclared" };
}

/**
 * A forced variant comes from an untrusted deep link, so one the experiment never declared is ignored.
 * With no rule the user is on control: there is no local split.
 */
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

/** One device's assignment to one experiment. A variant that `variants` lacks is held on control. */
export function resolveAssignment(options: ResolveAssignmentOptions): ResolvedAssignment {
  const { experimentKey, variants } = options;
  return holdUndeclared(
    experimentKey,
    decideAssignment(options),
    variants,
    controlVariant(variants),
  );
}
