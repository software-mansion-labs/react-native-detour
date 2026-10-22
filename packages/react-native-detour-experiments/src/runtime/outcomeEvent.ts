import type { ExperimentOutcomeEvent, LogOutcomeOptions } from "../types";
import { isDevRuntime } from "./environment";

export type OutcomeEventContext = Pick<
  ExperimentOutcomeEvent,
  "experimentKey" | "variant" | "source" | "timestamp"
>;

// Copy of detour-website `appEventInputSchema`; change both together.
const MAX_STEP = 50;

function outcomeProblem({ value, step }: LogOutcomeOptions): string | null {
  if (value !== undefined && !Number.isFinite(value)) {
    return `value must be a finite number (received ${String(value)})`;
  }
  if (step !== undefined && !(Number.isInteger(step) && step >= 1 && step <= MAX_STEP)) {
    return `step must be an integer from 1 to ${MAX_STEP} (received ${String(step)})`;
  }
  return null;
}

// Fields are copied one by one: `anchor` must never reach the event, the outbox or the payload.
export function buildOutcomeEvent(
  outcome: LogOutcomeOptions,
  context: OutcomeEventContext,
): ExperimentOutcomeEvent | null {
  const metric = outcome.metric.trim();
  if (!metric) return null;
  const problem = outcomeProblem(outcome);
  if (problem) {
    if (isDevRuntime()) {
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
