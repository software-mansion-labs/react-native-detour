import { OPENED_VIA_UNIVERSAL_LINK } from "./definedEvents";

// Mirrors `lib/services/eventsService/eventNames.ts` in detour-website. Keep in sync.

export const APP_EVENT_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;

/** `af_` marks events imported from an MMP; `dt_` is kept for Detour's own names. */
export const RESERVED_EVENT_NAME_PREFIXES = ["af_", "dt_"] as const;

/** The server turns these into link clicks, so an app may not log them itself. */
export const RESERVED_EVENT_NAMES: readonly string[] = [OPENED_VIA_UNIVERSAL_LINK];

/** The server's limit for `data`, as UTF-8 bytes of `JSON.stringify(data)`. */
export const MAX_EVENT_DATA_BYTES = 2048;

/** Why the server would refuse `name`, or `null` when it is a valid event name. */
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

/** UTF-8 length of `JSON.stringify(data)`, or `null` when it can't be serialized. */
export function jsonByteLength(data: unknown): number | null {
  let json: string | undefined;
  try {
    json = JSON.stringify(data);
  } catch {
    return null;
  }
  if (json === undefined) return 0;

  let bytes = 0;
  for (let i = 0; i < json.length; i++) {
    const code = json.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < json.length) {
      // A surrogate pair is one 4-byte code point.
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
