export enum DetourEventNames {
  // general
  Login = "login",
  Search = "search",
  Share = "share",
  SignUp = "sign_up",
  TutorialBegin = "tutorial_begin",
  TutorialComplete = "tutorial_complete",
  ReEngage = "re_engage",
  Invite = "invite",
  OpenedFromPushNotification = "opened_from_push_notification",
  // sales
  AddPaymentInfo = "add_payment_info",
  AddShippingInfo = "add_shipping_info",
  AddToCart = "add_to_cart",
  RemoveFromCart = "remove_from_cart",
  Refund = "refund",
  ViewItem = "view_item",
  BeginCheckout = "begin_checkout",
  Purchase = "purchase",
  AdImpression = "ad_impression",
}

export type DetourRevenueType =
  /** In-app purchases and subscriptions. */
  | "iap"
  /** Revenue from ads shown in the app. */
  | "in_app_ads"
  | "other";

/** A conversion with revenue, sent with `DetourAnalytics.logConversion`. */
export type DetourConversion = {
  name: string;
  revenue: number;
  /** ISO 4217 code, e.g. `USD`. */
  currency: string;
  revenueType: DetourRevenueType;
  productId?: string;
  quantity?: number;
  /** The store's transaction ID. A conversion repeated with the same ID is counted once. */
  transactionId?: string;
};

export type SessionEvent =
  | { type: "start"; sessionId: string; at: number }
  // Duration is wall time since the start, so the backend's `start = end - duration` still holds
  // when the start request was lost.
  | { type: "end"; sessionId: string; at: number; durationMs: number };

/** One analytics request; `sendAnalytics` builds its body and endpoint. */
export type AnalyticsRequest =
  | { kind: "event"; name: string; data?: unknown }
  | { kind: "retention"; name: string }
  | { kind: "session"; event: SessionEvent }
  | { kind: "conversion"; conversion: DetourConversion; at: number };
