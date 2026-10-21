import type { RemoteConfigPayload } from "../remoteConfig";
import type { AssignmentSource, FlagKey, Variant, VariantOverrides } from "../types";
import { applyRemoteRule, holdUndeclared } from "./assignment";
import type { DeviceAttributes } from "./deviceAttributes";

declare const __DEV__: boolean | undefined;

export type ResolvedFlag<V extends Variant = Variant> = {
  variant: V;
  /** Whether the flag is on: every variant but A is. */
  enabled: boolean;
  source: AssignmentSource;
};

export type ResolveFlagOptions = {
  /**
   * What the bucket is hashed from. `null` while the id is not known yet,
   * which holds a rollout on `defaultVariant`.
   */
  deviceId: string | null;
  flagKey: FlagKey;
  /** The flag's declared variants. Defaults to `["A", "B"]`. */
  variants?: readonly Variant[] | undefined;
  /** The declaration's `default`: what nothing deciding resolves to. Defaults to `"A"`. */
  defaultVariant?: Variant | undefined;
  /** The provider's overrides: a variant per key. */
  overrides?: Record<string, string> | undefined;
  /**
   * Variants pinned by screenshot capture's `detour_experiments_force` deep link. Top precedence:
   * capture must photograph the value it asked for whatever else is set.
   */
  forcedVariants?: VariantOverrides | undefined;
  remoteConfig?: RemoteConfigPayload | null | undefined;
  /**
   * What the device knows about itself, as read when the launch started. A
   * rule's audience is matched against it; without it no audience matches.
   */
  attributes?: DeviceAttributes | undefined;
};

const DEFAULT_VARIANTS: readonly Variant[] = ["A", "B"];

const warnedBooleanKeys = new Set<string>();

/** Plain JavaScript can pass a boolean override. It is ignored, with one warning per key in development. */
function warnBooleanOnce(flagKey: FlagKey, value: unknown): void {
  if (typeof value !== "boolean") return;
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  if (warnedBooleanKeys.has(flagKey)) return;
  warnedBooleanKeys.add(flagKey);
  console.warn(
    `[Detour Experiments] The override for flag "${flagKey}" is ${String(value)}, and is ignored: ` +
      `a flag is overridden with one of its variants. "A" is the flag off, and "B" is it on.`,
  );
}

function resolved(variant: Variant, source: AssignmentSource): ResolvedFlag {
  return { variant, enabled: variant !== "A", source };
}

/**
 * Resolved as an experiment is: capture forcing, the provider override, the dashboard's rule, the default.
 * A paused rule, a missed audience, a device not enrolled and an undeclared variant are all off.
 */
export function resolveFlag({
  deviceId,
  flagKey,
  variants = DEFAULT_VARIANTS,
  defaultVariant = "A",
  overrides = {},
  forcedVariants = {},
  remoteConfig = null,
  attributes,
}: ResolveFlagOptions): ResolvedFlag {
  const forced: unknown = forcedVariants[flagKey];
  if (typeof forced === "string" && variants.includes(forced)) {
    return resolved(forced, "devOverride");
  }

  const override: unknown = overrides[flagKey];
  warnBooleanOnce(flagKey, override);
  if (typeof override === "string" && variants.includes(override)) {
    return resolved(override, "devOverride");
  }

  const remoteRule = remoteConfig?.flags[flagKey];
  if (remoteRule) {
    const assignment = applyRemoteRule(deviceId, flagKey, remoteRule, {
      kind: "flag",
      held: "A",
      undecided: defaultVariant,
      attributes,
    });
    const { variant, source } = holdUndeclared(flagKey, assignment, variants, "A");
    return resolved(variant, source);
  }

  return resolved(defaultVariant, "default");
}
