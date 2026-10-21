"use client";

import React from "react";

import type { ResolvedAssignment } from "./assignment";
import { useExperimentsContext, useWaitForLaunch } from "./contextCore";
import { type Declaration, type JsonObject, resolvePayload } from "./declarations";
import { createExposureGate, sendsExposure } from "./exposureGate";

type DeclaredAssignment = {
  payload: JsonObject | null;
  logExposure: () => void;
};

// The effects keep their order: reset the gate, flush a held exposure, then log on mount.
export function useDeclaredAssignment(
  declaration: Declaration,
  { variant, source }: ResolvedAssignment,
): DeclaredAssignment {
  const { key, exposure, kind } = declaration;
  const {
    registerExperiment,
    unregisterExperiment,
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
    registerExperiment(key);
    return () => {
      unregisterExperiment(key);
    };
  }, [registerExperiment, unregisterExperiment, key]);

  useWaitForLaunch(source);

  const declaredPayload = declaration.payloads?.[variant];
  const rules = kind === "flag" ? remoteConfig?.flags : remoteConfig?.experiments;
  const remotePayload = rules?.[key]?.payloads?.[variant];
  const payload = React.useMemo(
    () => resolvePayload(declaredPayload, remotePayload),
    [declaredPayload, remotePayload],
  );

  const configVersion = remoteConfig?.version;
  const emitExposure = React.useCallback(() => {
    if (!sendsExposure(source)) return;
    onLogEvent?.({
      type: "exposure",
      experimentKey: key,
      variant,
      source,
      ...(configVersion !== undefined ? { configVersion } : {}),
      timestamp: Date.now(),
    });
  }, [key, variant, source, configVersion, onLogEvent]);

  const logExposure = React.useCallback(() => {
    if (gateRef.current.request(resolved)) emitExposure();
  }, [emitExposure, resolved]);

  React.useEffect(() => {
    gateRef.current.reset();
  }, [key, variant, source]);

  React.useEffect(() => {
    if (gateRef.current.flush(resolved)) emitExposure();
  }, [resolved, emitExposure]);

  const logsOnMount = exposure === "mount";
  React.useEffect(() => {
    if (logsOnMount) logExposure();
  }, [logsOnMount, logExposure, variant]);

  return { payload, logExposure };
}
