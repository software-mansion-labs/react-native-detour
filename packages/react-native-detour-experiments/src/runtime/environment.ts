declare const __DEV__: boolean | undefined;

export function isDevRuntime(): boolean {
  return typeof __DEV__ !== "undefined" && Boolean(__DEV__);
}

const warned = new Set<string>();

export function warnOnceInDev(id: string, message: string): void {
  if (!isDevRuntime() || warned.has(id)) return;
  warned.add(id);
  console.warn(message);
}

export function resetDevWarningsForTests(): void {
  warned.clear();
}

export function isDevEnvironment(): boolean {
  if (typeof __DEV__ !== "undefined") {
    return Boolean(__DEV__);
  }
  if (typeof process !== "undefined" && process.env && process.env["NODE_ENV"]) {
    return process.env["NODE_ENV"] !== "production";
  }
  return false;
}

// False under a test runner: a test that renders the provider expects its content at once.
export function isNativeRuntime(): boolean {
  if (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "test") return false;
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

export function backgroundTimer(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(callback, ms);
  (timer as { unref?: () => void }).unref?.();
  return timer;
}
