export type DeviceAttributes = {
  platform?: DevicePlatform;
  osVersion?: string;
  locale?: string;
  appVersion?: string;
  channel?: string;
  runtimeVersion?: string;
  updateId?: string;
  isEmbedded?: boolean;
};

export type DevicePlatform = "ios" | "android";

type NativePlatform = { OS?: unknown; Version?: unknown; constants?: unknown };

export type ReadDeviceAttributesOptions = {
  appVersion?: string | undefined;
  nativePlatform?: NativePlatform | undefined;
};

// The dashboard refuses an exposure whose version or locale is longer.
export const DEVICE_ATTRIBUTE_MAX_LENGTH = 64;

type ExpoGlobal = {
  expo?: { modules?: Record<string, Record<string, unknown> | undefined> | undefined } | undefined;
};

// Reads the Expo module registry instead of importing the package, to avoid a hard dependency.
function expoModule(name: string): Record<string, unknown> | undefined {
  return attempt(() => (globalThis as ExpoGlobal).expo?.modules?.[name]);
}

function readNativePlatform(): NativePlatform | undefined {
  return attempt(() => {
    const rn = require("react-native") as { Platform?: NativePlatform };
    return rn.Platform;
  });
}

export function readPlatformOS(): string | undefined {
  const os = attempt(() => readNativePlatform()?.OS);
  return typeof os === "string" ? os : undefined;
}

export function isDevicePlatform(platform: string | undefined): platform is DevicePlatform {
  return platform === "ios" || platform === "android";
}

function attempt<T>(read: () => T): NonNullable<T> | undefined {
  try {
    return read() ?? undefined;
  } catch {
    return undefined;
  }
}

function sendable(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" && value.length <= DEVICE_ATTRIBUTE_MAX_LENGTH
    ? value
    : undefined;
}

// Android's `Version` is the API level, so its release ("14") is read first: rules are written on it.
function readOsVersion(os: DevicePlatform, platform: NativePlatform): string | undefined {
  const version = attempt(() => platform.Version);
  if (os === "ios") return sendable(version);
  const release = attempt(() => (platform.constants as { Release?: unknown } | undefined)?.Release);
  return sendable(release) ?? (typeof version === "number" ? String(version) : sendable(version));
}

function readLocale(): string | undefined {
  return sendable(attempt(() => Intl.DateTimeFormat().resolvedOptions().locale));
}

function readAppVersion(): string | undefined {
  return sendable(attempt(() => expoModule("ExpoApplication")?.["nativeApplicationVersion"]));
}

function readUpdate(): Pick<
  DeviceAttributes,
  "channel" | "runtimeVersion" | "updateId" | "isEmbedded"
> {
  const updates = expoModule("ExpoUpdates");
  if (!updates) return {};

  const update: ReturnType<typeof readUpdate> = {};
  const read = (field: string) => attempt(() => updates[field]);
  const updateId = read("updateId");
  const channel = read("channel");
  const runtimeVersion = read("runtimeVersion");
  const isEmbedded = read("isEmbeddedLaunch");

  if (typeof updateId === "string" && updateId) update.updateId = updateId;
  if (typeof channel === "string" && channel) update.channel = channel;
  if (typeof runtimeVersion === "string" && runtimeVersion) update.runtimeVersion = runtimeVersion;
  if (typeof isEmbedded === "boolean") update.isEmbedded = isEmbedded;
  return update;
}

export function readDeviceAttributes(options: ReadDeviceAttributesOptions = {}): DeviceAttributes {
  const attributes: DeviceAttributes = {};

  const native = options.nativePlatform ?? readNativePlatform();
  const os = attempt(() => native?.OS);
  if (native && typeof os === "string" && isDevicePlatform(os)) {
    attributes.platform = os;
    const osVersion = readOsVersion(os, native);
    if (osVersion) attributes.osVersion = osVersion;
  }

  const locale = readLocale();
  if (locale) attributes.locale = locale;

  const appVersion = sendable(options.appVersion) ?? readAppVersion();
  if (appVersion) attributes.appVersion = appVersion;

  return { ...attributes, ...readUpdate() };
}
