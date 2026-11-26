import { isDevRuntime, warnOnceInDev } from "./environment";

export const TRIGGER_TESTID_PREFIX = "detour-experiments-trigger:";

export const TRIGGER_ANCHOR_KEY_PATTERN = /^[a-z0-9_-]{1,32}$/;

export type TriggerAnchorKey = string;

export type TriggerAnchorProps = {
  testID?: string;
};

export function isValidTriggerAnchorKey(key: string): boolean {
  return TRIGGER_ANCHOR_KEY_PATTERN.test(key);
}

// An invalid key falls back to the metric-only id, so the CLI and the runtime always agree.
export function triggerTestId(metric: string, key?: TriggerAnchorKey): string {
  const base = `${TRIGGER_TESTID_PREFIX}${metric}`;
  return key !== undefined && isValidTriggerAnchorKey(key) ? `${base}:${key}` : base;
}

export function triggerAnchorProps(metric: string, key?: TriggerAnchorKey): TriggerAnchorProps {
  if (!isDevRuntime() || !metric) return {};
  if (key !== undefined && !isValidTriggerAnchorKey(key)) {
    warnOnceInDev(
      `trigger-anchor:${metric}\u0000${key}`,
      `[Detour Experiments] triggerAnchorProps("${metric}", ${JSON.stringify(key)}): the key must match ` +
        `${TRIGGER_ANCHOR_KEY_PATTERN}, so it was ignored.`,
    );
  }
  return { testID: triggerTestId(metric, key) };
}
