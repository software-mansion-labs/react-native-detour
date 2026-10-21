import type { RemoteConfigPayload } from "../remoteConfig";
import type { AssignmentSource, FlagKey, Variant, VariantOverrides } from "../types";
import { applyRemoteRule, holdUndeclared } from "./assignment";
import type { DeviceAttributes } from "./deviceAttributes";
import { warnOnceInDev } from "./environment";

export type ResolvedFlag<V extends Variant = Variant> = {
  variant: V;
  enabled: boolean;
  source: AssignmentSource;
};

export type ResolveFlagOptions = {
  deviceId: string | null;
  flagKey: FlagKey;
  variants?: readonly Variant[] | undefined;
  defaultVariant?: Variant | undefined;
  overrides?: Record<string, string> | undefined;
  forcedVariants?: VariantOverrides | undefined;
  remoteConfig?: RemoteConfigPayload | null | undefined;
  attributes?: DeviceAttributes | undefined;
};

const DEFAULT_VARIANTS: readonly Variant[] = ["A", "B"];

function warnBooleanOnce(flagKey: FlagKey, value: unknown): void {
  if (typeof value !== "boolean") return;
  warnOnceInDev(
    `boolean-flag-override:${flagKey}`,
    `[Detour Experiments] The override for flag "${flagKey}" is ${String(value)}, and is ignored: ` +
      `a flag is overridden with one of its variants. "A" is the flag off, and "B" is it on.`,
  );
}

function resolved(variant: Variant, source: AssignmentSource): ResolvedFlag {
  return { variant, enabled: variant !== "A", source };
}

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
