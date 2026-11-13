"use client";

import React from "react";

import type { RemoteConfigPayload } from "../remoteConfig";
import type { AssignmentSource, ExperimentKey, FlagKey, OnLogEvent, Variant } from "../types";
import type { ResolvedAssignment } from "./assignment";
import type { Declaration, Registry } from "./declarations";
import type { ResolvedFlag } from "./resolveFlag";

export type ExperimentsContextValue = {
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
  onLogEvent?: OnLogEvent | undefined;
  remoteConfig: RemoteConfigPayload | null;
  registry: Registry;
  getDeclaration: (key: string) => Declaration | undefined;
  warnIfUnregistered: (declaration: Declaration) => void;
  resolved: boolean;
  awaitSession: (() => Promise<void>) | null;
};

export const ExperimentsContext = React.createContext<ExperimentsContextValue | null>(null);

export function useExperimentsContext(): ExperimentsContextValue {
  const ctx = React.useContext(ExperimentsContext);
  if (!ctx) {
    throw new Error(
      "useExperiment, useFeatureFlag and useExperimentsReady must be used within <DetourExperimentsProvider>. " +
        "Wrap your app root with DetourExperimentsProvider from @swmansion/react-native-detour-experiments.",
    );
  }
  return ctx;
}

export function useExperimentsReady(): boolean {
  return useExperimentsContext().awaitSession === null;
}

// A source other than "default" is final already, so it never waits for the session.
export function useWaitForLaunch(source: AssignmentSource): void {
  const { awaitSession } = useExperimentsContext();

  if (awaitSession && source === "default") throw awaitSession();
}
