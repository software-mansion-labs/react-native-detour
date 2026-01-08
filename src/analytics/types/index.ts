export enum DetourEventNames {
  // general
  Login = 'login',
  Search = 'search',
  Share = 'share',
  SignUp = 'sign_up',
  TutorialBegin = 'tutorial_begin',
  TutorialComplete = 'tutorial_complete',
  ReEngage = 're_engage',
  Invite = 'invite',
  OpenedFromPushNotification = 'opened_from_push_notification',
  // sales
  AddPaymentInfo = 'add_payment_info',
  AddShippingInfo = 'add_shipping_info',
  AddToCart = 'add_to_cart',
  RemoveFromCart = 'remove_from_cart',
  Refund = 'refund',
  ViewItem = 'view_item',
  BeginCheckout = 'begin_checkout',
  Purchase = 'purchase',
  AdImpression = 'ad_impression',
}

export type DetourEvent = {
  eventName: DetourEventNames;
  data?: any;
};
