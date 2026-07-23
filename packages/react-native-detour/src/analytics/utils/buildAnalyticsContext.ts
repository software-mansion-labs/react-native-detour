import * as Localization from "expo-localization";

import { getAppVersion, getBuildNumber } from "../../shared/appInfo";
import { getConsent } from "../../shared/consent";
import { collectDeviceIdentitySignals } from "../../shared/deviceIdentifiers";
import { getSafeOsVersion } from "../../shared/deviceInfo";
import { prepareDeviceIdForApi } from "../../shared/devicePersistence";
import type { DetourStorage } from "../../shared/storage";
import { getUserId } from "../../shared/userIdentity";
import { getSessionId } from "../hooks/useSessionTracking";
import type { AnalyticsContext, Conversion } from "../types";

export async function buildAnalyticsContext(storage: DetourStorage): Promise<AnalyticsContext> {
  const [deviceId, { idfv, aaid, idfa, attStatus }] = await Promise.all([
    prepareDeviceIdForApi(storage),
    collectDeviceIdentitySignals(),
  ]);

  const customerUserId = getUserId();
  const appVersion = getAppVersion();
  const buildNumber = getBuildNumber();
  const consent = getConsent();
  const osVersion = getSafeOsVersion();
  const locale = Localization.getLocales().map((l) => ({ languageTag: l.languageTag }));
  const sessionId = getSessionId();

  return {
    deviceId,
    idfv,
    aaid,
    idfa,
    customerUserId,
    appVersion,
    buildNumber,
    consent,
    osVersion,
    locale,
    attStatus,
    sessionId,
  };
}

export default buildAnalyticsContext;

export const toConversionFields = (conversion?: Conversion) => ({
  revenue: conversion?.revenue,
  currency: conversion?.currency,
  product_id: conversion?.productId,
  quantity: conversion?.quantity,
  transaction_id: conversion?.transactionId,
});

export const toMetadataFields = (ctx: AnalyticsContext) => ({
  idfv: ctx.idfv,
  aaid: ctx.aaid,
  idfa: ctx.idfa,
  customer_user_id: ctx.customerUserId,
  app_version: ctx.appVersion,
  build_number: ctx.buildNumber,
  consent: ctx.consent,
  os_version: ctx.osVersion,
  locale: ctx.locale,
  att_status: ctx.attStatus,
  session_id: ctx.sessionId,
});
