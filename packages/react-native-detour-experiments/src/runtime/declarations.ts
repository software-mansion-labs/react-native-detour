/**
 * Experiments and flags are declared in code and collected into a registry for the provider.
 * Every field is a literal on purpose: the CLI reads these calls statically.
 */

export type ExposureMode = "mount" | "manual";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

/** A hook's `payload` when the declaration has no `payloads`: what the dashboard sends, if anything. */
export type UndeclaredPayload = JsonObject | null;

export type ExperimentDeclaration<
  K extends string = string,
  V extends string = string,
  M extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  readonly kind: "experiment";
  readonly key: K;
  /** Contiguous letters from A. */
  readonly variants: readonly V[];
  /** `"mount"` logs the exposure when the hook mounts; `"manual"` waits for `logExposure()`. */
  readonly exposure: ExposureMode;
  readonly metrics: readonly M[];
  /** The default payload of each variant; the dashboard's payload for a variant replaces it. */
  readonly payloads?: { readonly [Letter in V]: P } | undefined;
};

export type FlagDeclaration<
  K extends string = string,
  V extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  readonly kind: "flag";
  readonly key: K;
  /** Contiguous letters from A. A is the flag off; every other value is it on. */
  readonly variants: readonly V[];
  /** The value the hook returns when nothing decides: no rule for the key, or no device id yet. */
  readonly default: V;
  readonly exposure: ExposureMode;
  /** The default payload of each value; the dashboard's payload for a value replaces it. */
  readonly payloads?: { readonly [Letter in V]: P } | undefined;
};

export type Declaration = ExperimentDeclaration | FlagDeclaration;

/** An ordered list of declarations; spread one registry into another to compose them. */
export type Registry<D extends Declaration = Declaration> = readonly D[];

const DEFAULT_VARIANTS = ["A", "B"] as const;

/** `P` is not `const`: a payload's values are defaults the dashboard may change, so they stay wide. */
export function defineExperiment<
  const K extends string,
  const V extends string = "A" | "B",
  const M extends string = never,
  P extends { readonly [Letter in V]: JsonObject } = never,
>(input: {
  key: K;
  variants?: readonly V[];
  exposure?: ExposureMode;
  metrics?: readonly M[];
  payloads?: P;
}): ExperimentDeclaration<K, V, M, [P] extends [never] ? UndeclaredPayload : P[V]> {
  return Object.freeze({
    kind: "experiment" as const,
    key: input.key,
    variants: Object.freeze([
      ...(input.variants ?? (DEFAULT_VARIANTS as readonly string[] as readonly V[])),
    ]),
    exposure: input.exposure ?? "mount",
    metrics: Object.freeze([...(input.metrics ?? [])]),
    ...(input.payloads !== undefined ? { payloads: Object.freeze({ ...input.payloads }) } : {}),
  });
}

/** `P` is not `const`, as for an experiment's payloads. */
export function defineFlag<
  const K extends string,
  const V extends string = "A" | "B",
  P extends { readonly [Letter in V]: JsonObject } = never,
>(input: {
  key: K;
  variants?: readonly V[];
  default?: NoInfer<V>;
  exposure?: ExposureMode;
  payloads?: P;
}): FlagDeclaration<K, V, [P] extends [never] ? UndeclaredPayload : P[V]> {
  return Object.freeze({
    kind: "flag" as const,
    key: input.key,
    variants: Object.freeze([
      ...(input.variants ?? (DEFAULT_VARIANTS as readonly string[] as readonly V[])),
    ]),
    default: input.default ?? ("A" as V),
    exposure: input.exposure ?? "mount",
    ...(input.payloads !== undefined ? { payloads: Object.freeze({ ...input.payloads }) } : {}),
  });
}

export function defineRegistry<const D extends readonly Declaration[]>(
  entries: D,
): Registry<D[number]> {
  return Object.freeze([...entries]);
}

/** What the provider's `overrides` accepts: a key maps to one of its declaration's variants. */
export type RegistryOverrides<D extends Declaration> = {
  [E in D as E["key"]]?: E extends ExperimentDeclaration<string, infer V, string>
    ? V
    : E extends FlagDeclaration<string, infer V>
      ? V
      : never;
};

export function isExperimentDeclaration(value: unknown): value is ExperimentDeclaration {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "experiment"
  );
}

export function isFlagDeclaration(value: unknown): value is FlagDeclaration {
  return (
    typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "flag"
  );
}
