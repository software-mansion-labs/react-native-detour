import { Platform } from "react-native";

import { type DetourRequestConfig, detourFetch } from "../../net/client";
import type { DetourEndpoint } from "../../net/endpoints";
import { getRequestContext } from "../../net/requestContext";
import type { SessionEvent } from "../session/sessionManager";
import type { DetourConversion } from "../types";

/** One analytics request; `sendAnalytics` builds its body and endpoint. */
export type AnalyticsRequest =
  | { kind: "event"; name: string; data?: unknown }
  | { kind: "retention"; name: string }
  | { kind: "session"; event: SessionEvent }
  | { kind: "conversion"; conversion: DetourConversion; at: number };

const ENDPOINTS: Record<AnalyticsRequest["kind"], DetourEndpoint> = {
  event: "analyticsEvent",
  retention: "analyticsRetention",
  session: "analyticsSession",
  conversion: "analyticsConversion",
};

const fieldsOf = (request: AnalyticsRequest): Record<string, unknown> => {
  switch (request.kind) {
    case "event":
      return {
        event_name: request.name,
        data: request.data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };
    case "retention":
      return {
        event_name: request.name,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };
    case "session": {
      const { event } = request;
      return {
        type: event.type,
        session_id: event.sessionId,
        timestamp: new Date(event.at).toISOString(),
        ...(event.type === "end" && { duration_ms: event.durationMs }),
      };
    }
    case "conversion": {
      const { conversion } = request;
      return {
        name: conversion.name,
        revenue: conversion.revenue,
        currency: conversion.currency,
        revenue_type: conversion.revenueType,
        product_id: conversion.productId,
        quantity: conversion.quantity,
        transaction_id: conversion.transactionId,
        timestamp: new Date(request.at).toISOString(),
      };
    }
  }
};

/** Context, then the request's own fields, which win on a shared name, then the identity. */
export const buildAnalyticsBody = async (
  request: AnalyticsRequest,
  deviceId: string,
  userId: string | null,
) => ({
  ...(await getRequestContext()),
  ...fieldsOf(request),
  device_id: deviceId,
  ...(userId !== null && { user_id: userId }),
});

export const sendAnalytics = async (
  request: AnalyticsRequest,
  {
    config,
    deviceId,
    userId,
  }: { config: DetourRequestConfig; deviceId: string; userId: string | null },
) => {
  const endpoint = ENDPOINTS[request.kind];
  try {
    const response = await detourFetch(endpoint, {
      config,
      body: await buildAnalyticsBody(request, deviceId, userId),
    });
    if (response !== null && !response.ok) {
      console.warn(`🔗[Detour:ANALYTICS_ERROR] Failed to send ${request.kind}: ${response.status}`);
    }
  } catch (error) {
    console.error(`🔗[Detour:ANALYTICS_ERROR] Network error sending ${request.kind}:`, error);
  }
};
