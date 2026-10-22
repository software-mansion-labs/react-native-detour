import type { UndeclaredPayload } from "./runtime/declarations";
import type { TriggerAnchorKey } from "./runtime/triggerAnchor";

export type Variant = "A" | "B" | "C" | "D" | "E" | "F" | string;

export type ExperimentKey = string;

export type FlagKey = string;

export type VariantOverrides = Record<ExperimentKey, Variant>;

export type AssignmentSource =
  | "devOverride"
  | "remote"
  | "paused"
  | "untargeted"
  | "notEnrolled"
  | "remoteWinner"
  | "undeclared"
  | "default";

export type ExperimentExposureEvent = {
  type: "exposure";
  experimentKey: ExperimentKey;
  variant: Variant;
  source: AssignmentSource;
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
  step?: number;
  isDev?: boolean;
};

export type ExperimentEvent = ExperimentExposureEvent | ExperimentOutcomeEvent;

export type OnLogEvent = (event: ExperimentEvent) => void;

export type LogOutcomeOptions<M extends string = string> = {
  metric: M;
  value?: number;
  step?: number;
  anchor?: TriggerAnchorKey;
};

export type ExperimentResult<
  V extends string = string,
  M extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  variant: V;
  payload: P;
  logExposure: () => void;
  logOutcome: (options: LogOutcomeOptions<M>) => void;
  source: AssignmentSource;
  resolved: boolean;
};

export type UseFeatureFlagResult<
  V extends string = string,
  P extends UndeclaredPayload = UndeclaredPayload,
> = {
  enabled: boolean;
  variant: V;
  payload: P;
  source: AssignmentSource;
  logExposure: () => void;
  resolved: boolean;
};
