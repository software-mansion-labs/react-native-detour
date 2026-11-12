import { useSyncExternalStore } from "react";

let started = false;
let resolveStarted: () => void = () => {};
const startedPromise = new Promise<void>((resolve) => {
  resolveStarted = resolve;
});
const listeners = new Set<() => void>();

/** Starts analytics, sessions and deferred link matching. `DetourProvider` calls it unless `autoStart` is false. */
export const start = () => {
  if (started) return;
  started = true;
  resolveStarted();
  listeners.forEach((listener) => listener());
};

export const isStarted = () => started;

export const whenStarted = () => startedPromise;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useIsStarted = () => useSyncExternalStore(subscribe, isStarted);
