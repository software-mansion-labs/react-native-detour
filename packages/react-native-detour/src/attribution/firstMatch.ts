let isRunning = false;
const endListeners = new Set<() => void>();

/** True while the first deferred match runs: the server does not have the install yet. */
export const isFirstMatchRunning = () => isRunning;

/** Called each time the first deferred match ends. */
export const onFirstMatchEnd = (listener: () => void) => {
  endListeners.add(listener);
};

/** Runs the first deferred match, from storing the first-launch flag to the server's answer. */
export const duringFirstMatch = async <T>(match: () => Promise<T>): Promise<T> => {
  isRunning = true;
  try {
    return await match();
  } finally {
    isRunning = false;
    endListeners.forEach((listener) => listener());
  }
};
