"use client";

import React from "react";

import type { ExperimentKey, FlagKey, OnLogEvent, Variant, VariantOverrides } from "../types";
import { type ResolvedAssignment, resolveAssignment } from "./assignment";
import { subscribeToForcedVariants } from "./captureBridge";
import { ExperimentsContext, type ExperimentsContextValue } from "./contextCore";
import { createEventSink } from "./createEventSink";
import type { Declaration, Registry, RegistryOverrides } from "./declarations";
import { isDevEnvironment, isDevRuntime, isNativeRuntime } from "./environment";
import { sendExposuresOnce } from "./exposureGate";
import { type LaunchOptions, prefetchLaunchConfig, startLaunch } from "./launch";
import { createMountedExperimentsStore } from "./mountedExperimentsStore";
import { startRemoteConfigSync, subscribeAppStateForeground } from "./remoteConfigSync";
import { type ResolvedFlag, resolveFlag } from "./resolveFlag";
import { readSession, sentExposuresOfLaunch, subscribeSession, whenSessionStarts } from "./session";
import { type StorageAdapter, resolveStorage } from "./storage";

export type DetourExperimentsProviderProps<R extends Registry = Registry> = {
  children: React.ReactNode;
  onLogEvent?: OnLogEvent | undefined;
  registry: R;
  overrides?: NoInfer<RegistryOverrides<R[number]>> | undefined;
  // The `config` given to `DetourProvider`, as is: one object keeps both SDKs on the same App and device id.
  detourConfig?: DetourExperimentsConfig | undefined;
  appVersion?: string | undefined;
  firstLaunchTimeoutMs?: number | undefined;
  refreshTimeoutMs?: number | undefined;
  // Not read when `onLogEvent` is given.
  devEvents?: boolean | undefined;
};

export type DetourExperimentsConfig = {
  // Read `process.env.EXPO_PUBLIC_DETOUR_APP_ID` in the app's own code: Expo does not inline it inside a package.
  appID?: string | undefined;
  apiKey?: string | undefined;
  storage?: StorageAdapter | undefined;
  shouldUseClipboard?: boolean | undefined;
  shouldTrackAutomaticEvents?: boolean | undefined;
  linkProcessingMode?: string | undefined;
};

const EMPTY_OVERRIDES: Record<string, string> = {};

const getServerSession = () => null;

// React 18 throws when a hook suspends in a synchronous render with no boundary above it, which
// is every render on the old architecture. React 19 waits instead, so it gets no boundary.
const NEEDS_SUSPENSE_BOUNDARY = Number.parseInt(React.version, 10) < 19;

// On a device the launch starts in render: a hook may suspend the root, and its effects would never run.
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
      if (!isDevRuntime() || declarationsByKey.has(declaration.key)) return;
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
  const [mountedStore] = React.useState(createMountedExperimentsStore);

  const apiKey = detourConfig?.apiKey;
  const appId = detourConfig?.appID;
  // An adapter built in render is a new object on every render. The event sink, the launch and
  // the sync effect all depend on `storage`, so it keeps one identity and reads the latest adapter.
  const resolvedStorage = resolveStorage(detourConfig?.storage);
  const latestStorage = React.useRef(resolvedStorage);
  latestStorage.current = resolvedStorage;
  const hasStorage = resolvedStorage !== undefined;
  const storage = React.useMemo<StorageAdapter | undefined>(
    () =>
      hasStorage
        ? {
            getItem: (key) => latestStorage.current?.getItem(key) ?? null,
            setItem: (key, value) => latestStorage.current?.setItem(key, value),
          }
        : undefined,
    [hasStorage],
  );

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

  if (isDevRuntime()) {
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

  const awaitSession = onDevice && !hasSession ? whenSessionStarts : null;

  const value = React.useMemo<ExperimentsContextValue>(
    () => ({
      overrides,
      resolveVariant,
      resolveFlag: resolveFlagCallback,
      onLogEvent: logEvent,
      registerExperiment: mountedStore.register,
      unregisterExperiment: mountedStore.unregister,
      subscribeMountedExperiments: mountedStore.subscribe,
      getMountedExperimentsSnapshot: mountedStore.getSnapshot,
      remoteConfig: sessionRemoteConfig,
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
      mountedStore,
      sessionRemoteConfig,
      hasSession,
      awaitSession,
      registry,
      getDeclaration,
      warnIfUnregistered,
    ],
  );

  const content =
    onDevice && NEEDS_SUSPENSE_BOUNDARY ? (
      <React.Suspense fallback={null}>{children}</React.Suspense>
    ) : (
      children
    );

  return <ExperimentsContext.Provider value={value}>{content}</ExperimentsContext.Provider>;
}
