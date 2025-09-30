import * as Clipboard from 'expo-clipboard';
import * as Localization from 'expo-localization';
import { Dimensions, PixelRatio, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export type ProbabilisticFingerprint = {
  platform: string;
  model: string;
  manufacturer: string;
  systemVersion: string;
  screenWidth: number;
  screenHeight: number;
  scale: number;
  locale: { languageTag: string }[];
  timezone: string | null | undefined;
  userAgent: string;
  timestamp: number;
  pastedLink?: string;
};

// used when install referrer on android is available
export type DeterministicFingerprint = {
  clickId: string;
};

export const getDeterministicFingerprint = (
  clickId: string
): DeterministicFingerprint => {
  return {
    clickId,
  };
};

export const getProbabilisticFingerprint = async (
  shouldUseClipboard: boolean
): Promise<ProbabilisticFingerprint> => {
  const { width, height } = Dimensions.get('window');
  const locales = Localization.getLocales();
  const localeLanguageTags = locales.map((locale) => ({
    languageTag: locale.languageTag,
  }));

  return {
    platform: Platform.OS,
    model: DeviceInfo.getModel(),
    manufacturer: await DeviceInfo.getManufacturer(),
    systemVersion: DeviceInfo.getSystemVersion(),
    screenWidth: width,
    screenHeight: height,
    scale: PixelRatio.get(),
    locale: localeLanguageTags,
    timezone: Localization.getCalendars()[0]?.timeZone,
    userAgent: await DeviceInfo.getUserAgent(),
    timestamp: Date.now(),
    pastedLink: shouldUseClipboard
      ? await Clipboard.getStringAsync()
      : undefined,
  };
};
