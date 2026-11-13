// The public API of the package.
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
export { useExperiment, useFeatureFlag } from "./hooks";
export type { VariantProps } from "./hooks";
export { useExperimentsReady } from "./contextCore";
export { createEventSink } from "./createEventSink";
export type { StorageAdapter } from "./storage";
export { triggerAnchorProps } from "./triggerAnchor";
export { refreshRemoteConfig } from "./remoteConfigFetch";
export { clearExperimentsData } from "./clearData";
export type { ClearExperimentsDataOptions } from "./clearData";
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
