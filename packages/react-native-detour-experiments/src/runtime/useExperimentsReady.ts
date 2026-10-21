"use client";

import { useExperimentsContext } from "./context";

/**
 * False on a device while the SDK is loading, true once it has loaded: no hook suspends from then on.
 * Always true off a device, where no hook waits. An app hides its splash screen when it turns true.
 */
export function useExperimentsReady(): boolean {
  return useExperimentsContext().awaitSession === null;
}
