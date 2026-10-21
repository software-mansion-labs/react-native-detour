"use client";

/**
 * The context object and the hooks that read it. `context.tsx` re-exports all
 * of this unchanged.
 */
import React from "react";

import type { RemoteConfigPayload } from "../remoteConfig";
import type { ExperimentKey, FlagKey, OnLogEvent, Variant } from "../types";
import type { ResolvedAssignment } from "./assignment";
import type { Declaration, Registry } from "./declarations";
import type { ResolvedFlag } from "./resolveFlag";

const EMPTY_EXPERIMENTS: readonly ExperimentKey[] = [];
const NOOP_SUBSCRIBE = () => () => {};
const GET_EMPTY_EXPERIMENTS = () => EMPTY_EXPERIMENTS;

const PACKAGE_NAME = "@swmansion/react-native-detour-experiments";

export type ExperimentsContextValue = {
  /** The provider's `overrides`: a variant per experiment or flag key. */
  overrides: Record<string, string>;
  resolveVariant: (
    experimentKey: ExperimentKey,
    variants?: readonly Variant[],
  ) => ResolvedAssignment;
  resolveFlag: (
    flagKey: FlagKey,
    variants?: readonly Variant[],
    defaultVariant?: Variant,
  ) => ResolvedFlag;
  /** The provider's sink, or its `onLogEvent`. An assignment's exposure passes once per launch. */
  onLogEvent?: OnLogEvent | undefined;
  registerExperiment: (experimentKey: ExperimentKey) => void;
  unregisterExperiment: (experimentKey: ExperimentKey) => void;
  subscribeMountedExperiments: (onStoreChange: () => void) => () => void;
  getMountedExperimentsSnapshot: () => readonly ExperimentKey[];
  /** The config this launch's assignments are made from; `null` before the session starts. */
  remoteConfig: RemoteConfigPayload | null;
  /** The provider's `registry`, or an empty one when none was passed. */
  registry: Registry;
  /** The registry's declaration for a key, if it has one. */
  getDeclaration: (key: string) => Declaration | undefined;
  /** Warns once per key, in development, when a hook's declaration is not in the registry. */
  warnIfUnregistered: (declaration: Declaration) => void;
  /**
   * Whether the assignment a hook returns is final: true once this launch's session has started.
   * A server render never has a session, so its assignments are provisional.
   */
  resolved: boolean;
  /**
   * What a hook suspends on, on a device, when it has nothing final to return.
   * `null` off a device, and once the session has started.
   */
  awaitSession: (() => Promise<void>) | null;
};

export const ExperimentsContext = React.createContext<ExperimentsContextValue | null>(null);

export function useExperimentsContext(): ExperimentsContextValue {
  const ctx = React.useContext(ExperimentsContext);
  if (!ctx) {
    throw new Error(
      "useExperiment, useFeatureFlag and useExperimentsReady must be used within <DetourExperimentsProvider>. " +
        `Wrap your app root with DetourExperimentsProvider from ${PACKAGE_NAME}.`,
    );
  }
  return ctx;
}

export function useExperimentsContextOptional(): ExperimentsContextValue | null {
  return React.useContext(ExperimentsContext);
}

export function useMountedExperiments(): readonly ExperimentKey[] {
  const ctx = useExperimentsContextOptional();
  const subscribe = ctx?.subscribeMountedExperiments ?? NOOP_SUBSCRIBE;
  const getSnapshot = ctx?.getMountedExperimentsSnapshot ?? GET_EMPTY_EXPERIMENTS;
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
