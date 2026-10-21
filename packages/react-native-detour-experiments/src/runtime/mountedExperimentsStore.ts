import type { ExperimentKey } from "../types";

type MountedExperimentsStore = {
  keys: readonly ExperimentKey[];
  counts: Map<ExperimentKey, number>;
  listeners: Set<() => void>;
};

export function createMountedExperimentsStore(): MountedExperimentsStore {
  return {
    keys: [],
    counts: new Map(),
    listeners: new Set(),
  };
}

function keysEqual(a: readonly ExperimentKey[], b: readonly ExperimentKey[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

/** Recompute sorted keys from ref counts; returns whether the public list changed. */
export function syncMountedExperimentKeys(store: MountedExperimentsStore): boolean {
  const next = [...store.counts.keys()].sort();
  if (keysEqual(store.keys, next)) {
    return false;
  }
  store.keys = next;
  return true;
}

function notifyMountedExperimentsListeners(store: MountedExperimentsStore): void {
  for (const listener of store.listeners) {
    listener();
  }
}

/** Publish count changes when they alter the visible experiment list. */
export function commitMountedExperiments(store: MountedExperimentsStore): void {
  if (syncMountedExperimentKeys(store)) {
    notifyMountedExperimentsListeners(store);
  }
}
