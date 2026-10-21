import type { JsonObject } from "./declarations";

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The payload a hook returns: the dashboard's whole when it sets one, else the declared one.
 * Nothing checks it against the declared keys, so the inferred type holds only if it has them all.
 */
export function resolvePayload(
  declared: JsonObject | null | undefined,
  remote: unknown,
): JsonObject | null {
  return isJsonObject(remote) ? remote : (declared ?? null);
}
