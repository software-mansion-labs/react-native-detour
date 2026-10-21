declare const __DEV__: boolean | undefined;

/**
 * True in a development build or a test run. `__DEV__` decides where it is defined; elsewhere a
 * `NODE_ENV` other than `production` does. With neither, the build counts as production.
 */
export function isDevEnvironment(): boolean {
  if (typeof __DEV__ !== "undefined") {
    return Boolean(__DEV__);
  }
  if (typeof process !== "undefined" && process.env && process.env["NODE_ENV"]) {
    return process.env["NODE_ENV"] !== "production";
  }
  return false;
}
