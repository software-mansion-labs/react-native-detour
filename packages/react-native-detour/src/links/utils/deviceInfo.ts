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
  source: "expo-device" | "react-native-device-info";
};

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
  const expoModel = normalizeValue(expoDevice?.modelName);
  if (expoModel !== UNKNOWN) {
    return expoModel;
  }

  const rnModel = normalizeValue(reactNativeDeviceInfo?.getModel?.());
  if (rnModel !== UNKNOWN) {
    return rnModel;
  }

  return UNKNOWN;
};

const getOsVersion = (): string => {
  const expoOsVersion = normalizeValue(expoDevice?.osVersion);
  if (expoOsVersion !== UNKNOWN) {
    return expoOsVersion;
  }

  const rnOsVersion = normalizeValue(reactNativeDeviceInfo?.getSystemVersion?.());
  if (rnOsVersion !== UNKNOWN) {
    return rnOsVersion;
  }

  return UNKNOWN;
};

const getManufacturer = async (): Promise<string> => {
  const expoManufacturer = normalizeValue(expoDevice?.manufacturer);
  if (expoManufacturer !== UNKNOWN) {
    return expoManufacturer;
  }

  const rnManufacturerSync = normalizeValue(reactNativeDeviceInfo?.getManufacturerSync?.());
  if (rnManufacturerSync !== UNKNOWN) {
    return rnManufacturerSync;
  }

  try {
    const rnManufacturerAsync = normalizeValue(await reactNativeDeviceInfo?.getManufacturer?.());
    if (rnManufacturerAsync !== UNKNOWN) {
      return rnManufacturerAsync;
    }
  } catch {
    // Ignore and return unknown below.
  }

  return UNKNOWN;
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  if (!expoDevice && !reactNativeDeviceInfo) {
    throw new Error(
      '[react-native-detour] No device info library found. Install either "expo-device" or "react-native-device-info".',
    );
  }

  const [manufacturer] = await Promise.all([getManufacturer()]);

  return {
    model: getModel(),
    manufacturer,
    osVersion: getOsVersion(),
    source: expoDevice ? "expo-device" : "react-native-device-info",
  };
};
