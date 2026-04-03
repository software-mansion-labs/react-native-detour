import { Dimensions, PixelRatio, Platform } from "react-native";

import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Localization from "expo-localization";

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

export const getDeterministicFingerprint = (clickId: string): DeterministicFingerprint => {
  return {
    clickId,
  };
};

export const getProbabilisticFingerprint = async (
  shouldUseClipboard: boolean,
): Promise<ProbabilisticFingerprint> => {
  const { width, height } = Dimensions.get("screen");
  const locales = Localization.getLocales();
  const localeLanguageTags = locales.map((locale) => ({
    languageTag: locale.languageTag,
  }));

  const normalizeValue = (value: unknown): string => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
    return "unknown";
  };

  const model = normalizeValue(Device.modelName);
  const manufacturer = normalizeValue(Device.manufacturer);
  const systemVersion = normalizeValue(Device.osVersion);

  let userAgent = "unknown";
  if (typeof Constants.getWebViewUserAgentAsync === "function") {
    userAgent = (await Constants.getWebViewUserAgentAsync().catch(() => null)) ?? "unknown";
  }

  return {
    platform: Platform.OS,
    model,
    manufacturer,
    systemVersion,
    screenWidth: width,
    screenHeight: height,
    scale: PixelRatio.get(),
    locale: localeLanguageTags,
    timezone: Localization.getCalendars()[0]?.timeZone,
    userAgent,
    timestamp: Date.now(),
    pastedLink:
      shouldUseClipboard && Platform.OS === "ios" ? await Clipboard.getStringAsync() : undefined,
  };
};
