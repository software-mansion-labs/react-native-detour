/**
 * True in an app running on a device, which is where a hook suspends until the session starts.
 * False under a test runner: a test that renders the provider expects its content at once.
 */
export function isNativeRuntime(): boolean {
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "test") return false;
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}
