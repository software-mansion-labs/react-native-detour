/**
 * What the SDK knows about the device and the build it runs. Every Exposure
 * carries it. An attribute that could not be read is absent.
 */
export type DeviceAttributes = {
  platform?: DevicePlatform;
  /** iOS's version, or Android's release (`"14"`), so the two compare alike. */
  osVersion?: string;
  locale?: string;
  /** The native app version: the store's, not an update's. */
  appVersion?: string;
  channel?: string;
  runtimeVersion?: string;
  updateId?: string;
  /** Whether the launch runs the bundle the binary shipped with, not an update. */
  isEmbedded?: boolean;
};

export type DevicePlatform = "ios" | "android";

/** What is read of react-native's `Platform`. */
type NativePlatform = { OS?: unknown; Version?: unknown; constants?: unknown };

export type ReadDeviceAttributesOptions = {
  /** The provider's `appVersion`. It wins over `expo-application`'s. */
  appVersion?: string | undefined;
  /** @internal Stands in for react-native's `Platform`, which tests cannot load. */
  nativePlatform?: NativePlatform | undefined;
};

/** The dashboard refuses an Exposure whose version or locale is longer. */
export const DEVICE_ATTRIBUTE_MAX_LENGTH = 64;

type ExpoGlobal = {
  expo?: { modules?: Record<string, Record<string, unknown> | undefined> | undefined } | undefined;
};

/**
 * A native module from the Expo module registry on `globalThis`. Reading the registry, not importing
 * the package, keeps the SDK free of hard dependencies.
 */
function expoModule(name: string): Record<string, unknown> | undefined {
  return attempt(() => (globalThis as ExpoGlobal).expo?.modules?.[name]);
}

/** react-native's `Platform`; undefined where there is no react-native. */
function readNativePlatform(): NativePlatform | undefined {
  return attempt(() => {
    const rn = require("react-native") as { Platform?: NativePlatform };
    return rn.Platform;
  });
}

/** react-native's `Platform.OS`, whatever it is; undefined where there is no react-native. */
export function readPlatformOS(): string | undefined {
  const os = attempt(() => readNativePlatform()?.OS);
  return typeof os === "string" ? os : undefined;
}

export function isDevicePlatform(platform: string | undefined): platform is DevicePlatform {
  return platform === "ios" || platform === "android";
}

/** A read that may throw, as a native getter does when its module is not linked. */
function attempt<T>(read: () => T): NonNullable<T> | undefined {
  try {
    return read() ?? undefined;
  } catch {
    return undefined;
  }
}

/** A version or a locale the dashboard will take, or nothing. */
function sendable(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" && value.length <= DEVICE_ATTRIBUTE_MAX_LENGTH
    ? value
    : undefined;
}

/** Android's `Version` is the API level, so its release (`"14"`) is read first: rules are written on it. */
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

/** The update this launch runs, from `expo-updates`. */
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

/**
 * Reads the device's attributes. None of them changes during a launch, so the caller reads them once.
 * An `appVersion` option that cannot be sent, empty or too long, leaves the native version.
 */
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
