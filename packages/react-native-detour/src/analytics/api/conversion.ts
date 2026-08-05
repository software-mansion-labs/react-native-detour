import { Platform } from "react-native";

import { SDK_HEADER_VALUE } from "../../version";
import type { AnalyticsContext, Conversion } from "../types";
import { toMetadataFields } from "../utils/buildAnalyticsContext";

const CONVERSION_API_URL = "https://godetour.dev/api/analytics/conversion";

export const sendConversion = async ({
  apiKey,
  appID,
  eventName,
  conversion,
  ...ctx
}: {
  apiKey: string;
  appID: string;
  eventName: string;
  conversion: Conversion;
} & AnalyticsContext) => {
  try {
    const response = await fetch(CONVERSION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-App-ID": appID,
        "X-SDK": SDK_HEADER_VALUE,
      },
      body: JSON.stringify({
        event_name: eventName,
        revenue: conversion.revenue,
        currency: conversion.currency,
        product_id: conversion.productId,
        quantity: conversion.quantity,
        transaction_id: conversion.transactionId,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        device_id: ctx.deviceId,
        metadata: toMetadataFields(ctx),
      }),
    });

    if (!response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to log conversion: ${response.status}`);
    }
  } catch (error) {
    console.error("🔗[Detour:ANALYTICS_ERROR] Network error logging conversion:", error);
  }
};
