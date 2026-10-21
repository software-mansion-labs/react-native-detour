"use client";

import React from "react";

import type { UseFeatureFlagResult } from "../types";
import { useExperimentsContext } from "./context";
import type { FlagDeclaration, UndeclaredPayload } from "./declarations";
import { createExposureGate, sendsExposure } from "./exposureGate";
import { resolvePayload } from "./payload";
import { useWaitForLaunch } from "./useWaitForLaunch";

/**
 * Decided once per launch.
 * The effects keep their order: reset the gate, flush a held exposure, then log on mount.
 */
export function useFeatureFlag<V extends string, P extends UndeclaredPayload>(
  declaration: FlagDeclaration<string, V, P>,
): UseFeatureFlagResult<V, P> {
  const { key: flagKey, variants, default: defaultVariant } = declaration;
  const logsOnMount = declaration.exposure === "mount";
  const {
    registerExperiment,
    unregisterExperiment,
    resolveFlag,
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
    registerExperiment(flagKey);
    return () => {
      unregisterExperiment(flagKey);
    };
  }, [registerExperiment, unregisterExperiment, flagKey]);

  const resolution = resolveFlag(flagKey, variants, defaultVariant);

  useWaitForLaunch(resolution.source);

  const declaredPayload = declaration.payloads?.[resolution.variant as V];
  const remotePayload = remoteConfig?.flags[flagKey]?.payloads?.[resolution.variant];
  const payload = React.useMemo(
    () => resolvePayload(declaredPayload, remotePayload) as P,
    [declaredPayload, remotePayload],
  );

  const configVersion = remoteConfig?.version;
  const emitExposure = React.useCallback(() => {
    if (!sendsExposure(resolution.source)) return;
    onLogEvent?.({
      type: "exposure",
      experimentKey: flagKey,
      variant: resolution.variant,
      source: resolution.source,
      ...(configVersion !== undefined ? { configVersion } : {}),
      timestamp: Date.now(),
    });
  }, [flagKey, resolution.variant, resolution.source, configVersion, onLogEvent]);

  const logExposure = React.useCallback(() => {
    if (gateRef.current.request(resolved)) {
      emitExposure();
    }
  }, [emitExposure, resolved]);

  React.useEffect(() => {
    gateRef.current.reset();
  }, [flagKey, resolution.variant, resolution.source]);

  React.useEffect(() => {
    if (gateRef.current.flush(resolved)) {
      emitExposure();
    }
  }, [resolved, emitExposure]);

  const variant = resolution.variant;
  React.useEffect(() => {
    if (logsOnMount) logExposure();
  }, [logsOnMount, logExposure, variant]);

  return {
    enabled: resolution.enabled,
    variant: resolution.variant as V,
    payload,
    source: resolution.source,
    logExposure,
    resolved,
  };
}
