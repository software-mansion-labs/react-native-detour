import type { ExperimentKey } from "../types";

export type MountedExperimentsStore = {
  register: (key: ExperimentKey) => void;
  unregister: (key: ExperimentKey) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly ExperimentKey[];
};

export function createMountedExperimentsStore(): MountedExperimentsStore {
  const counts = new Map<ExperimentKey, number>();
  const listeners = new Set<() => void>();
  let keys: readonly ExperimentKey[] = [];

  const commit = () => {
    const next = [...counts.keys()].sort();
    if (next.length === keys.length && next.every((key, index) => key === keys[index])) return;
    keys = next;
    for (const listener of listeners) listener();
  };

  return {
    register(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      commit();
    },
    unregister(key) {
      const remaining = (counts.get(key) ?? 0) - 1;
      if (remaining <= 0) counts.delete(key);
      else counts.set(key, remaining);
      commit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => keys,
  };
}
