"use client";

import type { AssignmentSource } from "../types";
import { useExperimentsContext } from "./context";

/**
 * On a device, a component that reads a key before the session starts suspends here.
 * A `source` other than `"default"` is final already, an override or a forced variant, and never waits.
 */
export function useWaitForLaunch(source: AssignmentSource): void {
  const { awaitSession } = useExperimentsContext();

  if (awaitSession && source === "default") throw awaitSession();
}
