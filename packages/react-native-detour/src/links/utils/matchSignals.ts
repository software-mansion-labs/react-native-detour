import { Dimensions, PixelRatio, Platform } from "react-native";

import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Localization from "expo-localization";

import { getDeviceInfo } from "./deviceInfo";

export type SignalMatchRequest = {
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
  device_id?: string;
  user_id?: string;
};

// used when install referrer on android is available
export type DirectMatchRequest = {
  clickId: string;
  device_id?: string;
  user_id?: string;
};

export const buildDirectMatchRequest = (clickId: string): DirectMatchRequest => {
  return {
    clickId,
  };
};

export const buildSignalMatchRequest = async (
  shouldUseClipboard: boolean,
): Promise<SignalMatchRequest> => {
  const { width, height } = Dimensions.get("screen");
  const locales = Localization.getLocales();
  const localeLanguageTags = locales.map((locale) => ({
    languageTag: locale.languageTag,
  }));

  const { model, manufacturer, osVersion: systemVersion } = await getDeviceInfo();

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
