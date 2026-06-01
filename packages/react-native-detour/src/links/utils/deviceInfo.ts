type ExpoDeviceModule = {
  modelName?: string | null;
  manufacturer?: string | null;
  osVersion?: string | null;
};

type ReactNativeDeviceInfoModule = {
  getModel?: () => string;
  getSystemVersion?: () => string;
  getManufacturerSync?: () => string;
  getManufacturer?: () => Promise<string>;
};

type DeviceInfo = {
  model: string;
  manufacturer: string;
  osVersion: string;
};

type SyncDeviceInfo = Pick<DeviceInfo, "model" | "osVersion">;

const UNKNOWN = "unknown";

const normalizeValue = (value: unknown): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return UNKNOWN;
};

const firstKnown = (...candidates: (() => unknown)[]): string => {
  for (const fn of candidates) {
    const value = normalizeValue(fn());
    if (value !== UNKNOWN) {
      return value;
    }
  }

  return UNKNOWN;
};

const firstKnownAsync = async (
  ...candidates: (() => unknown | Promise<unknown>)[]
): Promise<string> => {
  for (const fn of candidates) {
    const value = normalizeValue(await fn());
    if (value !== UNKNOWN) {
      return value;
    }
  }

  return UNKNOWN;
};

// Metro needs string literal in require() during bundle time, with previous version it caused errors
const expoDevice = (() => {
  try {
    return require("expo-device") as ExpoDeviceModule;
  } catch {
    return null;
  }
})();

const reactNativeDeviceInfo = (() => {
  try {
    return require("react-native-device-info") as ReactNativeDeviceInfoModule;
  } catch {
    return null;
  }
})();

const getModel = (): string => {
  return firstKnown(
    () => expoDevice?.modelName,
    () => reactNativeDeviceInfo?.getModel?.(),
  );
};

const getOsVersion = (): string => {
  return firstKnown(
    () => expoDevice?.osVersion,
    () => reactNativeDeviceInfo?.getSystemVersion?.(),
  );
};

const getManufacturer = async (): Promise<string> => {
  return firstKnownAsync(
    () => expoDevice?.manufacturer,
    async () => {
      try {
        return await reactNativeDeviceInfo?.getManufacturer?.();
      } catch {
        return UNKNOWN;
      }
    },
    () => reactNativeDeviceInfo?.getManufacturerSync?.(),
  );
};

const assertDeviceInfoLibraryAvailable = (): void => {
  if (!expoDevice && !reactNativeDeviceInfo) {
    throw new Error(
      '[react-native-detour] No device info library found. Install either "expo-device" or "react-native-device-info".',
    );
  }
};

export const getSyncDeviceInfo = (): SyncDeviceInfo => {
  assertDeviceInfoLibraryAvailable();

  return {
    model: getModel(),
    osVersion: getOsVersion(),
  };
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  assertDeviceInfoLibraryAvailable();

  const manufacturer = await getManufacturer();

  return {
    model: getModel(),
    manufacturer,
    osVersion: getOsVersion(),
  };
};
