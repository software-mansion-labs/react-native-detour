"use client";

import React from "react";

import type { ExperimentResult, LogOutcomeOptions, UseFeatureFlagResult } from "../types";
import { useExperimentsContext } from "./contextCore";
import type { ExperimentDeclaration, FlagDeclaration, UndeclaredPayload } from "./declarations";
import { buildOutcomeEvent } from "./outcomeEvent";
import { useDeclaredAssignment } from "./useDeclaredAssignment";

export type VariantProps<T> =
  T extends React.JSXElementConstructor<infer P>
    ? unknown extends P
      ? Record<string, never>
      : P
    : never;

export function useExperiment<V extends string, M extends string, P extends UndeclaredPayload>(
  declaration: ExperimentDeclaration<string, V, M, P>,
): ExperimentResult<V, M, P> {
  const { resolveVariant, onLogEvent, resolved } = useExperimentsContext();
  const assignment = resolveVariant(declaration.key, declaration.variants);
  const { payload, logExposure } = useDeclaredAssignment(declaration, assignment);

  const { key } = declaration;
  const { variant, source } = assignment;
  const logOutcome = React.useCallback(
    (outcome: LogOutcomeOptions<M>) => {
      const event = buildOutcomeEvent(outcome, {
        experimentKey: key,
        variant,
        source,
        timestamp: Date.now(),
      });
      if (event) onLogEvent?.(event);
    },
    [key, variant, source, onLogEvent],
  );

  return {
    variant: variant as V,
    payload: payload as P,
    logExposure,
    logOutcome,
    source,
    resolved,
  };
}

export function useFeatureFlag<V extends string, P extends UndeclaredPayload>(
  declaration: FlagDeclaration<string, V, P>,
): UseFeatureFlagResult<V, P> {
  const { resolveFlag, resolved } = useExperimentsContext();
  const resolution = resolveFlag(declaration.key, declaration.variants, declaration.default);
  const { payload, logExposure } = useDeclaredAssignment(declaration, resolution);

  return {
    enabled: resolution.enabled,
    variant: resolution.variant as V,
    payload: payload as P,
    source: resolution.source,
    logExposure,
    resolved,
  };
}
