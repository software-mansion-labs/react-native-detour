declare const __DEV__: boolean | undefined;

export const TRIGGER_TESTID_PREFIX = "detour-experiments-trigger:";

/** Lowercase letters, digits, `_` and `-`, 1–32 characters. */
export const TRIGGER_ANCHOR_KEY_PATTERN = /^[a-z0-9_-]{1,32}$/;

/**
 * Tells apart several triggers for the same metric on one screen, such as `"hero"` and `"footer"`.
 * Must match {@link TRIGGER_ANCHOR_KEY_PATTERN}.
 */
export type TriggerAnchorKey = string;

export type TriggerAnchorProps = {
  testID?: string;
};

export function isValidTriggerAnchorKey(key: string): boolean {
  return TRIGGER_ANCHOR_KEY_PATTERN.test(key);
}

/**
 * The test id capture looks for. An invalid key falls back to the metric-only id, as
 * {@link triggerAnchorProps} does, so the CLI and the runtime always agree on an element's id.
 */
export function triggerTestId(metric: string, key?: TriggerAnchorKey): string {
  const base = `${TRIGGER_TESTID_PREFIX}${metric}`;
  return key !== undefined && isValidTriggerAnchorKey(key) ? `${base}:${key}` : base;
}

const warnedKeys = new Set<string>();

/**
 * Tags the element that emits a metric so screenshot capture can find its exact rectangle. Returns nothing
 * unless `__DEV__` is true, so no test ids ship to production or to a build that does not define it.
 */
export function triggerAnchorProps(metric: string, key?: TriggerAnchorKey): TriggerAnchorProps {
  if (typeof __DEV__ === "undefined" || !__DEV__) return {};
  if (!metric) return {};
  const tag = `${metric}\u0000${key}`;
  if (key !== undefined && !isValidTriggerAnchorKey(key) && !warnedKeys.has(tag)) {
    warnedKeys.add(tag);
    console.warn(
      `[Detour Experiments] triggerAnchorProps("${metric}", ${JSON.stringify(key)}): the key must match ` +
        `${TRIGGER_ANCHOR_KEY_PATTERN}, so it was ignored.`,
    );
  }
  return { testID: triggerTestId(metric, key) };
}
