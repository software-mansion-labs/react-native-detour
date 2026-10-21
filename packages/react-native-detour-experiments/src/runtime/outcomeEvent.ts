import type { ExperimentOutcomeEvent, LogOutcomeOptions } from "../types";

declare const __DEV__: boolean | undefined;

export type OutcomeEventContext = Pick<
  ExperimentOutcomeEvent,
  "experimentKey" | "variant" | "source" | "timestamp"
>;

/** The highest funnel step. Copy of detour-website `appEventInputSchema`; change both together. */
const MAX_STEP = 50;

/** Why Detour's ingest would reject the outcome's App Event, or null when it would take it. */
function outcomeProblem(outcome: LogOutcomeOptions): string | null {
  const { value, step } = outcome;
  if (value !== undefined && !Number.isFinite(value)) {
    return `value must be a finite number (received ${String(value)})`;
  }
  if (step !== undefined && !(Number.isInteger(step) && step >= 1 && step <= MAX_STEP)) {
    return `step must be an integer from 1 to ${MAX_STEP} (received ${String(step)})`;
  }
  return null;
}

/**
 * The event `logOutcome` hands to `onLogEvent`, or null for a blank metric or a value or step the ingest
 * rejects. Fields are copied one by one: `anchor` must never reach the event, the outbox or the payload.
 */
export function buildOutcomeEvent(
  outcome: LogOutcomeOptions,
  context: OutcomeEventContext,
): ExperimentOutcomeEvent | null {
  const metric = outcome.metric.trim();
  if (!metric) return null;
  const problem = outcomeProblem(outcome);
  if (problem) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`[Detour Experiments] Outcome "${metric}" dropped: ${problem}.`);
    }
    return null;
  }
  return {
    type: "outcome",
    ...context,
    metric,
    ...(outcome.value !== undefined ? { value: outcome.value } : {}),
    ...(outcome.step !== undefined ? { step: outcome.step } : {}),
  };
}
