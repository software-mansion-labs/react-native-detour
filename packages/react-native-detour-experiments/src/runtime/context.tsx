"use client";

import React from "react";

import type { ExperimentKey, FlagKey, OnLogEvent, Variant, VariantOverrides } from "../types";
import { type ResolvedAssignment, resolveAssignment } from "./assignment";
import { subscribeToForcedVariants } from "./captureBridge";
import { ExperimentsContext, type ExperimentsContextValue } from "./contextCore";
import { createEventSink } from "./createEventSink";
import type { Declaration, Registry, RegistryOverrides } from "./declarations";
import { isDevEnvironment } from "./env";
import { sendExposuresOnce } from "./exposureGate";
import { type LaunchOptions, prefetchLaunchConfig, startLaunch } from "./launch";
import { commitMountedExperiments, createMountedExperimentsStore } from "./mountedExperimentsStore";
import { isNativeRuntime } from "./nativeRuntime";
import { startRemoteConfigSync, subscribeAppStateForeground } from "./remoteConfigSync";
import { type ResolvedFlag, resolveFlag } from "./resolveFlag";
import { type StorageAdapter, resolveStorage } from "./resolveStorage";
import { readSession, sentExposuresOfLaunch, subscribeSession, whenSessionStarts } from "./session";

declare const __DEV__: boolean | undefined;

export type { ResolvedAssignment } from "./assignment";
export type { ResolvedFlag } from "./resolveFlag";

export type { ExperimentsContextValue } from "./contextCore";
export {
  useExperimentsContext,
  useExperimentsContextOptional,
  useMountedExperiments,
} from "./contextCore";

export type DetourExperimentsProviderProps<R extends Registry = Registry> = {
  children: React.ReactNode;
  onLogEvent?: OnLogEvent | undefined;
  /** Every experiment and flag the app uses, from `defineRegistry`. */
  registry: R;
  /**
   * Fixed assignments, typed from `registry`: a key maps to one of its
   * declaration's variants, for an experiment and a flag alike. Applied only in a development
   * build or a test run: a release build ignores them, so no override reaches production users.
   */
  overrides?: NoInfer<RegistryOverrides<R[number]>> | undefined;
  /**
   * The `config` given to `DetourProvider`, passed as is. One object keeps both SDKs on the same App
   * and device id, which is what joins Exposures to the Outcomes Detour logs.
   */
  detourConfig?: DetourExperimentsConfig | undefined;
  /**
   * What an audience on the app version is matched against, and sent with every exposure.
   * Needed only where `expo-application` is not installed, or to override what it reports.
   */
  appVersion?: string | undefined;
  /**
   * How long a launch with no config on the device waits for the first one, in milliseconds.
   * Past it the whole launch runs on control. Default 400, at most 10 000; `0` never waits.
   */
  firstLaunchTimeoutMs?: number | undefined;
  /**
   * How long a launch with a config on the device waits for a fresh one, in milliseconds.
   * Default `0`: a dashboard change lands a launch later. At most 10 000.
   */
  refreshTimeoutMs?: number | undefined;
  /**
   * `false` sends no exposures or outcomes from a development build, overrides and capture previews
   * included. Default `true`. Not read when `onLogEvent` is given.
   */
  devEvents?: boolean | undefined;
};

/**
 * The object `DetourProvider` takes as `config`, so one object fits both providers.
 * Declared here, not imported, because the Detour SDK is not a dependency.
 */
export type DetourExperimentsConfig = {
  /**
   * The App. In an Expo app, `process.env.EXPO_PUBLIC_DETOUR_APP_ID`, read in the app's own code:
   * Expo does not inline `EXPO_PUBLIC_*` inside a package, so the SDK cannot read it.
   */
  appID?: string | undefined;
  /** Its Publishable Key. In an Expo app, `process.env.EXPO_PUBLIC_DETOUR_API_KEY`. */
  apiKey?: string | undefined;
  /**
   * Persists the event outbox, the remote config and the device id users are bucketed by.
   * Defaults to Detour's own: AsyncStorage, or `localStorage` on web.
   */
  storage?: StorageAdapter | undefined;
  /** Detour's own. Not read here. */
  shouldUseClipboard?: boolean | undefined;
  /** Detour's own. Not read here. */
  shouldTrackAutomaticEvents?: boolean | undefined;
  /** Detour's own. Not read here, so any mode Detour adds is accepted. */
  linkProcessingMode?: string | undefined;
};

const EMPTY_OVERRIDES: Record<string, string> = {};

const getServerSession = () => null;

/**
 * On a device the launch starts in render: a hook may suspend the root, and its effects would never run.
 * Elsewhere it starts in an effect, because a server render must never start a session.
 */
export function DetourExperimentsProvider<R extends Registry = Registry>({
  children,
  onLogEvent: onLogEventProp,
  registry,
  overrides: overridesProp,
  detourConfig,
  appVersion,
  firstLaunchTimeoutMs,
  refreshTimeoutMs,
  devEvents,
}: DetourExperimentsProviderProps<R>) {
  const overrides = (
    isDevEnvironment() ? (overridesProp ?? EMPTY_OVERRIDES) : EMPTY_OVERRIDES
  ) as Record<string, string>;
  const declarationsByKey = React.useMemo(
    () =>
      new Map<string, Declaration>(registry.map((declaration) => [declaration.key, declaration])),
    [registry],
  );
  const getDeclaration = React.useCallback(
    (key: string) => declarationsByKey.get(key),
    [declarationsByKey],
  );
  const warnedKeysRef = React.useRef(new Set<string>());
  const warnIfUnregistered = React.useCallback(
    (declaration: Declaration) => {
      if (typeof __DEV__ === "undefined" || !__DEV__) return;
      if (declarationsByKey.has(declaration.key)) return;
      if (warnedKeysRef.current.has(declaration.key)) return;
      warnedKeysRef.current.add(declaration.key);
      console.warn(
        `[Detour Experiments] "${declaration.key}" is not in the registry passed to <DetourExperimentsProvider>. ` +
          `Add it to your defineRegistry([...]) so detour-experiments doctor and overrides can see it.`,
      );
    },
    [declarationsByKey],
  );
  const [forcedVariants, setForcedVariants] = React.useState<VariantOverrides>({});
  const mountedStoreRef = React.useRef(createMountedExperimentsStore());

  const apiKey = detourConfig?.apiKey;
  const appId = detourConfig?.appID;
  const configStorage = detourConfig?.storage;
  const storage = React.useMemo(() => resolveStorage(configStorage), [configStorage]);

  const session = React.useSyncExternalStore(subscribeSession, readSession, getServerSession);
  const hasSession = session !== null;

  const [onDevice] = React.useState(isNativeRuntime);

  const launchOptions = React.useMemo<LaunchOptions>(
    () => ({ apiKey, appId, storage, firstLaunchTimeoutMs, refreshTimeoutMs, appVersion }),
    [apiKey, appId, storage, firstLaunchTimeoutMs, refreshTimeoutMs, appVersion],
  );

  if (onDevice) startLaunch(launchOptions);
  else prefetchLaunchConfig(launchOptions);
  React.useEffect(() => {
    if (!onDevice) startLaunch(launchOptions);
  }, [onDevice, launchOptions]);

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    if (!apiKey)
      console.error(
        "[Detour Experiments] No API key: pass detourConfig.apiKey (in an Expo app, process.env.EXPO_PUBLIC_DETOUR_API_KEY)",
      );
    if (!appId)
      console.error(
        "[Detour Experiments] No App ID: pass detourConfig.appID (in an Expo app, process.env.EXPO_PUBLIC_DETOUR_APP_ID)",
      );
  }

  const onLogEvent = React.useMemo(
    () => onLogEventProp ?? createEventSink({ apiKey, appId, storage, appVersion, devEvents }),
    [onLogEventProp, apiKey, appId, storage, appVersion, devEvents],
  );

  const logEvent = React.useMemo(
    () => sendExposuresOnce(onLogEvent, sentExposuresOfLaunch()),
    [onLogEvent],
  );

  React.useEffect(() => {
    const sink = onLogEvent as { flush?: () => Promise<void> };
    if (typeof sink.flush !== "function") return;
    sink.flush();
    return subscribeAppStateForeground(() => {
      sink.flush?.();
    });
  }, [onLogEvent]);

  React.useEffect(
    () => startRemoteConfigSync({ apiKey, appId, storage }),
    [apiKey, appId, storage],
  );

  React.useEffect(
    () =>
      subscribeToForcedVariants((forced) => {
        setForcedVariants((prev) => ({ ...prev, ...forced }));
      }),
    [],
  );

  const sessionDeviceId = session?.deviceId ?? null;
  const sessionRemoteConfig = session?.remoteConfig ?? null;
  const sessionAttributes = session?.attributes;

  const resolveVariant = React.useCallback(
    (experimentKey: ExperimentKey, variants?: readonly Variant[]): ResolvedAssignment =>
      resolveAssignment({
        deviceId: sessionDeviceId,
        experimentKey,
        variants,
        overrides,
        forcedVariants,
        remoteConfig: sessionRemoteConfig,
        attributes: sessionAttributes,
      }),
    [sessionDeviceId, sessionRemoteConfig, sessionAttributes, overrides, forcedVariants],
  );

  const resolveFlagCallback = React.useCallback(
    (flagKey: FlagKey, variants?: readonly Variant[], defaultVariant?: Variant): ResolvedFlag =>
      resolveFlag({
        deviceId: sessionDeviceId,
        flagKey,
        variants,
        defaultVariant,
        overrides,
        forcedVariants,
        remoteConfig: sessionRemoteConfig,
        attributes: sessionAttributes,
      }),
    [sessionDeviceId, sessionRemoteConfig, sessionAttributes, overrides, forcedVariants],
  );

  const registerExperiment = React.useCallback((experimentKey: ExperimentKey) => {
    const store = mountedStoreRef.current;
    store.counts.set(experimentKey, (store.counts.get(experimentKey) ?? 0) + 1);
    commitMountedExperiments(store);
  }, []);

  const unregisterExperiment = React.useCallback((experimentKey: ExperimentKey) => {
    const store = mountedStoreRef.current;
    const next = (store.counts.get(experimentKey) ?? 0) - 1;
    if (next <= 0) store.counts.delete(experimentKey);
    else store.counts.set(experimentKey, next);
    commitMountedExperiments(store);
  }, []);

  const subscribeMountedExperiments = React.useCallback((onStoreChange: () => void) => {
    const store = mountedStoreRef.current;
    store.listeners.add(onStoreChange);
    return () => {
      store.listeners.delete(onStoreChange);
    };
  }, []);

  const getMountedExperimentsSnapshot = React.useCallback(() => mountedStoreRef.current.keys, []);

  const remoteConfig = sessionRemoteConfig;

  const awaitSession = onDevice && !hasSession ? whenSessionStarts : null;

  const value = React.useMemo<ExperimentsContextValue>(
    () => ({
      overrides,
      resolveVariant,
      resolveFlag: resolveFlagCallback,
      onLogEvent: logEvent,
      registerExperiment,
      unregisterExperiment,
      subscribeMountedExperiments,
      getMountedExperimentsSnapshot,
      remoteConfig,
      resolved: hasSession,
      awaitSession,
      registry,
      getDeclaration,
      warnIfUnregistered,
    }),
    [
      overrides,
      resolveVariant,
      resolveFlagCallback,
      logEvent,
      registerExperiment,
      unregisterExperiment,
      subscribeMountedExperiments,
      getMountedExperimentsSnapshot,
      remoteConfig,
      hasSession,
      awaitSession,
      registry,
      getDeclaration,
      warnIfUnregistered,
    ],
  );

  return <ExperimentsContext.Provider value={value}>{children}</ExperimentsContext.Provider>;
}
