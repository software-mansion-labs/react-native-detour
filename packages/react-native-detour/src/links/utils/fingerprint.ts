import { Dimensions, PixelRatio, Platform } from "react-native";

import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Localization from "expo-localization";

import { prepareDeviceIdForApi } from "../../analytics/utils/devicePersistence";
import { getUserId } from "../../analytics/utils/userIdentity";
import type { DetourStorage } from "../types";
import { collectDeviceIdentitySignals } from "./deviceIdentifiers";
import { getDeviceInfo } from "./deviceInfo";

// Identity signals shared by both fingerprint variants — this is what lets
// match-link recognize a device via the same identity graph keys used by
// events, instead of only ever seeing a fresh "install".
export type DeviceIdentityFields = {
  install_id: string;
  idfv?: string;
  aaid?: string;
  idfa?: string;
  customer_user_id?: string;
};

export type ProbabilisticFingerprint = DeviceIdentityFields & {
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
  utm?: Record<string, string>;
};

// used when install referrer on android is available
export type DeterministicFingerprint = DeviceIdentityFields & {
  clickId: string;
  utm?: Record<string, string>;
};

const collectIdentityFields = async (storage: DetourStorage): Promise<DeviceIdentityFields> => {
  const [installId, { idfv, aaid, idfa }] = await Promise.all([
    prepareDeviceIdForApi(storage),
    collectDeviceIdentitySignals(),
  ]);

  return {
    install_id: installId,
    idfv,
    aaid,
    idfa,
    customer_user_id: getUserId(),
  };
};

export const getDeterministicFingerprint = async (
  clickId: string,
  storage: DetourStorage,
  utm?: Record<string, string>,
): Promise<DeterministicFingerprint> => {
  return {
    clickId,
    utm,
    ...(await collectIdentityFields(storage)),
  };
};

export const getProbabilisticFingerprint = async (
  shouldUseClipboard: boolean,
  storage: DetourStorage,
  utm?: Record<string, string>,
): Promise<ProbabilisticFingerprint> => {
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
    ...(await collectIdentityFields(storage)),
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
    utm,
  };
};
