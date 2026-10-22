import type { AssignmentSource, OnLogEvent } from "../types";

// The other sources put the device in no arm of a split, so counting them would pad an arm.
export function sendsExposure(source: AssignmentSource): boolean {
  return source === "remote" || source === "devOverride";
}

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

// An exposure requested before the assignment settles is held, then emitted against the final one.
type ExposureGate = {
  request(resolved: boolean): boolean;
  flush(resolved: boolean): boolean;
  reset(): void;
  hasPending(): boolean;
  hasEmitted(): boolean;
};

export function createExposureGate(): ExposureGate {
  let emitted = false;
  let pending = false;

  return {
    request(resolved) {
      if (emitted) return false;
      if (!resolved) {
        pending = true;
        return false;
      }
      emitted = true;
      pending = false;
      return true;
    },
    flush(resolved) {
      if (!resolved || !pending || emitted) return false;
      emitted = true;
      pending = false;
      return true;
    },
    reset() {
      emitted = false;
    },
    hasPending: () => pending,
    hasEmitted: () => emitted,
  };
}
