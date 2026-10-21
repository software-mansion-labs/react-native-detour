import type { UndeclaredPayload } from "./runtime/declarations";
import type { TriggerAnchorKey } from "./runtime/triggerAnchor";

/** A to F, the letters a declaration may use. Any string type-checks, so `Record<Variant, …>` stays open. */
export type Variant = "A" | "B" | "C" | "D" | "E" | "F" | string;

export type ExperimentKey = string;

export type FlagKey = string;

export type VariantOverrides = Record<ExperimentKey, Variant>;

/**
 * What decided an assignment. Only `"remote"` and `"devOverride"` (a provider override or a capture
 * deep link) are exposures. `"default"` is no rule, or no device id yet. `"notEnrolled"` is outside the rollout. `"undeclared"` is a variant the build lacks.
 */
export type AssignmentSource =
  | "devOverride"
  | "remote"
  | "paused"
  | "untargeted"
  | "notEnrolled"
  | "remoteWinner"
  | "undeclared"
  | "default";

/** An exposure to an experiment or to a flag: a flag's key and variant go in the same fields. */
export type ExperimentExposureEvent = {
  type: "exposure";
  experimentKey: ExperimentKey;
  variant: Variant;
  source: AssignmentSource;
  /**
   * The remote config version this launch decides from. The dashboard counts the exposure under that
   * version's traffic settings. Absent only when an override decided before any config was known.
   */
  configVersion?: number | undefined;
  timestamp: number;
  isDev?: boolean;
};

export type ExperimentOutcomeEvent = {
  type: "outcome";
  experimentKey: ExperimentKey;
  variant: Variant;
  source: AssignmentSource;
  timestamp: number;
  metric: string;
  value?: number;
  /** Funnel position, 1-based. See {@link LogOutcomeOptions.step}. */
  step?: number;
  isDev?: boolean;
};

export type ExperimentEvent = ExperimentExposureEvent | ExperimentOutcomeEvent;

export type OnLogEvent = (event: ExperimentEvent) => void;

export type LogOutcomeOptions<M extends string = string> = {
  metric: M;
  /** A finite number; the outcome is dropped otherwise. */
  value?: number;
  /** Funnel position, apart from `value`: an integer from 1 to 50, or the outcome is dropped. */
  step?: number;
  /**
   * Pairs this call with the element tagged `triggerAnchorProps(metric, anchor)` when one metric fires
   * from several elements on a screen. Only the source scan reads it: it is never logged or sent.
   */
  anchor?: TriggerAnchorKey;
};

/** `useExperiment(declaration)`: the variant and metric names are the declaration's own. */
export type ExperimentResult<
  V extends string = string,
  M extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  variant: V;
  /**
   * The resolved variant's payload: the dashboard's when it sets one, else the declared one.
   * `null` when neither has one. The same object until either changes.
   */
  payload: P;
  logExposure: () => void;
  logOutcome: (options: LogOutcomeOptions<M>) => void;
  source: AssignmentSource;
  /**
   * Whether the assignment is final. A device suspends until it is, unless an override decides the key.
   * On the web, a server and a test runner it starts `false`, on control, and turns `true` once.
   */
  resolved: boolean;
};

/** `useFeatureFlag(declaration)`: the variant names are the declaration's own. */
export type UseFeatureFlagResult<
  V extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  /** Whether the flag is on: `variant !== "A"`. */
  enabled: boolean;
  /** The resolved value. A is the flag off; with only A and B, B is it on. */
  variant: V;
  /** The resolved variant's payload; see {@link ExperimentResult.payload}. */
  payload: P;
  source: AssignmentSource;
  logExposure: () => void;
  /** See {@link ExperimentResult.resolved}. */
  resolved: boolean;
};
