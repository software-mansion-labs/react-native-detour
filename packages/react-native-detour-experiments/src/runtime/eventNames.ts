// Mirrors `packages/react-native-detour/src/analytics/const/eventNames.ts`, which mirrors the
// server. Keep in sync: `__tests__/eventNames.test.ts` compares both. Copied, not imported, as
// the Detour SDK is an optional peer and its older versions do not have the rule.

export const APP_EVENT_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;

// `af_` marks events imported from AppsFlyer; `dt_` is kept for Detour's own names.
export const RESERVED_EVENT_NAME_PREFIXES = ["af_", "dt_"] as const;

// The server turns these into link clicks, so an app may not log them itself.
export const RESERVED_EVENT_NAMES: readonly string[] = ["opened_via_universal_link"];

// Why the server would refuse `name`, or `null` when it is a valid event name.
export function eventNameProblem(name: unknown): string | null {
  if (typeof name !== "string" || !APP_EVENT_NAME_PATTERN.test(name)) {
    return `event names must match ${APP_EVENT_NAME_PATTERN.source}`;
  }
  if (RESERVED_EVENT_NAME_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    return `the ${RESERVED_EVENT_NAME_PREFIXES.join(" and ")} prefixes are reserved`;
  }
  if (RESERVED_EVENT_NAMES.includes(name)) {
    return "this name is reserved for Detour";
  }
  return null;
}
