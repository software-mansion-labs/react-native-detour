const listeners = new Set<() => void>();

/** Called after a consent, config or kill switch change, so requests that waited can be decided. */
export const onConsentInputsChange = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyConsentInputsChange = () => listeners.forEach((listener) => listener());
