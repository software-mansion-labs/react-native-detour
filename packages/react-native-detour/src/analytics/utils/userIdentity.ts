// In-memory only, by design: the host app is the source of truth for its own
// login state and is expected to call setUserId() again on every cold start
// once auth is known (same convention as AppsFlyer's setCustomerUserId /
// Branch's setIdentity). Persisting it ourselves risks a stale customer_user_id
// surviving a logout the host app forgot to clear.
let customerUserId: string | undefined;

export const setUserId = (id: string | null): void => {
  customerUserId = id ?? undefined;
};

export const getUserId = (): string | undefined => customerUserId;
