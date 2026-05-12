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

const requireOptional = <T>(moduleName: string): T | null => {
  try {
    return require(moduleName) as T;
  } catch {
    return null;
  }
};

const expoDevice = requireOptional<ExpoDeviceModule>("expo-device");
const reactNativeDeviceInfo = requireOptional<ReactNativeDeviceInfoModule>(
  "react-native-device-info",
);

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
  const [manufacturer] = await Promise.all([getManufacturer()]);

  return {
    model: getModel(),
    manufacturer,
    osVersion: getOsVersion(),
  };
};
