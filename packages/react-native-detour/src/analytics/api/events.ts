import { Platform } from "react-native";

import type { AttStatus } from "../../links/utils/deviceIdentifiers";
import { SDK_HEADER_VALUE } from "../../version";
import type { Conversion, DetourEvent } from "../types";
import type { Consent } from "../utils/consent";

const EVENT_API_URL = "https://godetour.dev/api/analytics/event";

export const sendEvent = async ({
  apiKey,
  appID,
  deviceId,
  event,
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
  conversion,
}: {
  apiKey: string;
  appID: string;
  event: DetourEvent;
  deviceId: string;
  idfv?: string;
  aaid?: string;
  idfa?: string;
  customerUserId?: string;
  appVersion?: string;
  buildNumber?: string;
  consent?: Consent;
  osVersion?: string;
  locale?: string[];
  attStatus?: AttStatus;
  sessionId?: string;
  conversion?: Conversion;
}) => {
  try {
    const response = await fetch(EVENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({
        event_name: event.eventName,
        data: event.data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: deviceId,
        idfv,
        aaid,
        idfa,
        customer_user_id: customerUserId,
        app_version: appVersion,
        build_number: buildNumber,
        consent,
        os_version: osVersion,
        locale,
        att_status: attStatus,
        session_id: sessionId,
        revenue: conversion?.revenue,
        currency: conversion?.currency,
        product_id: conversion?.productId,
        quantity: conversion?.quantity,
        transaction_id: conversion?.transactionId,
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log event: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging event:", error);
  }
};
