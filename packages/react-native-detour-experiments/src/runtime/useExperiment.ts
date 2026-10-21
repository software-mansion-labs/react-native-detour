"use client";

import React from "react";

import type { ExperimentResult, LogOutcomeOptions } from "../types";
import { useExperimentsContext } from "./context";
import type { ExperimentDeclaration, UndeclaredPayload } from "./declarations";
import { createExposureGate, sendsExposure } from "./exposureGate";
import { buildOutcomeEvent } from "./outcomeEvent";
import { resolvePayload } from "./payload";
import { useWaitForLaunch } from "./useWaitForLaunch";

/**
 * The props a component experiment's file takes: variant A's. A component
 * written without a props parameter takes none.
 */
export type VariantProps<T> =
  T extends React.JSXElementConstructor<infer P>
    ? unknown extends P
      ? Record<string, never>
      : P
    : never;

/**
 * Decided once per launch. The register effect depends on the stable callbacks only, or it would loop.
 * The effects keep their order: reset the gate, flush a held exposure, then log on mount.
 */
export function useExperiment<V extends string, M extends string, P extends UndeclaredPayload>(
  declaration: ExperimentDeclaration<string, V, M, P>,
): ExperimentResult<V, M, P> {
  const { key: experimentKey, variants } = declaration;
  const logsOnMount = declaration.exposure === "mount";
  const {
    registerExperiment,
    unregisterExperiment,
    resolveVariant,
    onLogEvent,
    remoteConfig,
    resolved,
    warnIfUnregistered,
  } = useExperimentsContext();
  const gateRef = React.useRef(createExposureGate());

  React.useEffect(() => {
    warnIfUnregistered(declaration);
  }, [declaration, warnIfUnregistered]);

  React.useEffect(() => {
    registerExperiment(experimentKey);
    return () => {
      unregisterExperiment(experimentKey);
    };
  }, [registerExperiment, unregisterExperiment, experimentKey]);

  const assignment = resolveVariant(experimentKey, variants);

  useWaitForLaunch(assignment.source);

  const declaredPayload = declaration.payloads?.[assignment.variant as V];
  const remotePayload = remoteConfig?.experiments[experimentKey]?.payloads?.[assignment.variant];
  const payload = React.useMemo(
    () => resolvePayload(declaredPayload, remotePayload) as P,
    [declaredPayload, remotePayload],
  );

  const configVersion = remoteConfig?.version;
  const emitExposure = React.useCallback(() => {
    if (!sendsExposure(assignment.source)) return;
    onLogEvent?.({
      type: "exposure",
      experimentKey,
      variant: assignment.variant,
      source: assignment.source,
      ...(configVersion !== undefined ? { configVersion } : {}),
      timestamp: Date.now(),
    });
  }, [assignment.source, assignment.variant, configVersion, experimentKey, onLogEvent]);

  const logExposure = React.useCallback(() => {
    if (gateRef.current.request(resolved)) {
      emitExposure();
    }
  }, [emitExposure, resolved]);

  const logOutcome = React.useCallback(
    (outcome: LogOutcomeOptions<M>) => {
      const event = buildOutcomeEvent(outcome, {
        experimentKey,
        variant: assignment.variant,
        source: assignment.source,
        timestamp: Date.now(),
      });
      if (event) {
        onLogEvent?.(event);
      }
    },
    [assignment.source, assignment.variant, experimentKey, onLogEvent],
  );

  React.useEffect(() => {
    gateRef.current.reset();
  }, [assignment.variant, assignment.source, experimentKey]);

  React.useEffect(() => {
    if (gateRef.current.flush(resolved)) {
      emitExposure();
    }
  }, [resolved, emitExposure]);

  const variant = assignment.variant;
  React.useEffect(() => {
    if (logsOnMount) logExposure();
  }, [logsOnMount, logExposure, variant]);

  return {
    variant: assignment.variant as V,
    payload,
    logExposure,
    logOutcome,
    source: assignment.source,
    resolved,
  };
}
