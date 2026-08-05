import * as Localization from "expo-localization";

import { getAppVersion, getBuildNumber } from "../../shared/appInfo";
import { getConsent, hydrateConsent, isAdvertisingIdAllowed } from "../../shared/consent";
import { collectDeviceIdentitySignals } from "../../shared/deviceIdentifiers";
import { getSafeOsVersion } from "../../shared/deviceInfo";
import { prepareDeviceIdForApi } from "../../shared/devicePersistence";
import type { DetourStorage } from "../../shared/storage";
import { getUserId } from "../../shared/userIdentity";
import { getSessionId } from "../hooks/useSessionTracking";
import type { AnalyticsContext } from "../types";

export async function buildAnalyticsContext(storage: DetourStorage): Promise<AnalyticsContext> {
  // Stored layers first, then the device's own answer, and only then is consent
  // resolved — so the record never depends on whether the OS read or the host's
  // setConsent() happened to land first.
  await hydrateConsent(storage);

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

  // A refusal has to remove the identifier, not just describe it. The OS already
  // withholds its own ad id when it is the one refusing; this covers the case
  // where the host's UI collected the refusal and the OS knows nothing about it.
  const adIdAllowed = isAdvertisingIdAllowed();

  return {
    deviceId,
    idfv,
    aaid: adIdAllowed ? aaid : undefined,
    idfa: adIdAllowed ? idfa : undefined,
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
