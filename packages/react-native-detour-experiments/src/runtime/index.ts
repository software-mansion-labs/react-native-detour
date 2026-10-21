/** What an app calls. The CLI imports the rest of `src/runtime` by file path. */
export { DetourExperimentsProvider } from "./context";
export type { DetourExperimentsProviderProps, DetourExperimentsConfig } from "./context";
export { defineExperiment, defineFlag, defineRegistry } from "./declarations";
export type {
  Declaration,
  ExperimentDeclaration,
  ExposureMode,
  FlagDeclaration,
  JsonObject,
  JsonValue,
  Registry,
  RegistryOverrides,
} from "./declarations";
export type { DeviceAttributes } from "./deviceAttributes";
export { useExperiment } from "./useExperiment";
export type { VariantProps } from "./useExperiment";
export { useFeatureFlag } from "./useFeatureFlag";
export { useExperimentsReady } from "./useExperimentsReady";
export { createEventSink } from "./createEventSink";
export type { StorageAdapter } from "./resolveStorage";
export { triggerAnchorProps } from "./triggerAnchor";
export { refreshRemoteConfig } from "./remoteConfigFetch";
export type { FetchRemoteConfigOptions, RefreshRemoteConfigResult } from "./remoteConfigFetch";
export type { TriggerAnchorKey, TriggerAnchorProps } from "./triggerAnchor";
export type { CreateEventSinkOptions } from "./createEventSink";
export type {
  Variant,
  AssignmentSource,
  ExperimentKey,
  FlagKey,
  ExperimentEvent,
  ExperimentExposureEvent,
  ExperimentOutcomeEvent,
  OnLogEvent,
  LogOutcomeOptions,
  ExperimentResult,
  UseFeatureFlagResult,
} from "../types";
