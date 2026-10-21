import type { AssignmentSource, OnLogEvent } from "../types";

/**
 * Whether an assignment from `source` is an exposure: a running rule bucketed the device, or an
 * override decided. The rest put the device in no arm of a split, so counting them would pad an arm.
 */
export function sendsExposure(source: AssignmentSource): boolean {
  return source === "remote" || source === "devOverride";
}

/**
 * Passes an exposure of one assignment to `sink` once, however many hooks read the key or mount again.
 * `sent` is the launch's. A changed assignment, as capture forces, is sent anew.
 */
export function sendExposuresOnce(sink: OnLogEvent, sent: Set<string>): OnLogEvent {
  return (event) => {
    if (event.type === "exposure") {
      const assignment = `${event.experimentKey}\u0000${event.variant}\u0000${event.source}`;
      if (sent.has(assignment)) return;
      sent.add(assignment);
    }
    sink(event);
  };
}

/**
 * A hook's exposure is recorded at most once per assignment. One requested before the assignment settles
 * is held, not dropped, and emitted against the final assignment.
 */
type ExposureGate = {
  /** True when the exposure should be emitted now; false when it was already recorded or is held. */
  request(resolved: boolean): boolean;
  /** Called once the assignment settles. True when a held exposure is now due. */
  flush(resolved: boolean): boolean;
  /** Called when the assignment changes, so the next exposure is recorded again. */
  reset(): void;
  hasPending(): boolean;
  hasEmitted(): boolean;
};

export function createExposureGate(): ExposureGate {
  let emitted = false;
  let pending = false;

  return {
    request(resolved: boolean): boolean {
      if (emitted) return false;
      if (!resolved) {
        pending = true;
        return false;
      }
      emitted = true;
      pending = false;
      return true;
    },
    flush(resolved: boolean): boolean {
      if (!resolved || !pending || emitted) return false;
      emitted = true;
      pending = false;
      return true;
    },
    reset(): void {
      emitted = false;
    },
    hasPending: () => pending,
    hasEmitted: () => emitted,
  };
}
