// Every field is a literal on purpose: the CLI reads these calls statically.
export type ExposureMode = "mount" | "manual";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = { readonly [key: string]: JsonValue };

export type UndeclaredPayload = JsonObject | null;

export type ExperimentDeclaration<
  K extends string = string,
  V extends string = string,
  M extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  readonly kind: "experiment";
  readonly key: K;
  readonly variants: readonly V[];
  readonly exposure: ExposureMode;
  readonly metrics: readonly M[];
  readonly payloads?: { readonly [Letter in V]: P } | undefined;
};

export type FlagDeclaration<
  K extends string = string,
  V extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  readonly kind: "flag";
  readonly key: K;
  readonly variants: readonly V[];
  readonly default: V;
  readonly exposure: ExposureMode;
  readonly payloads?: { readonly [Letter in V]: P } | undefined;
};

export type Declaration = ExperimentDeclaration | FlagDeclaration;

export type Registry<D extends Declaration = Declaration> = readonly D[];

const DEFAULT_VARIANTS = ["A", "B"] as const;

function declaredVariants<V extends string>(variants: readonly V[] | undefined): readonly V[] {
  return Object.freeze([...(variants ?? (DEFAULT_VARIANTS as readonly string[] as readonly V[]))]);
}

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
    variants: declaredVariants(input.variants),
    exposure: input.exposure ?? "mount",
    metrics: Object.freeze([...(input.metrics ?? [])]),
    ...(input.payloads !== undefined ? { payloads: Object.freeze({ ...input.payloads }) } : {}),
  });
}

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
    variants: declaredVariants(input.variants),
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

export type RegistryOverrides<D extends Declaration> = {
  [E in D as E["key"]]?: E extends ExperimentDeclaration<string, infer V, string>
    ? V
    : E extends FlagDeclaration<string, infer V>
      ? V
      : never;
};

function hasKind(value: unknown, kind: Declaration["kind"]): boolean {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === kind;
}

export function isExperimentDeclaration(value: unknown): value is ExperimentDeclaration {
  return hasKind(value, "experiment");
}

export function isFlagDeclaration(value: unknown): value is FlagDeclaration {
  return hasKind(value, "flag");
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolvePayload(
  declared: JsonObject | null | undefined,
  remote: unknown,
): JsonObject | null {
  return isJsonObject(remote) ? remote : (declared ?? null);
}
