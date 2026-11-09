/** Identity fields of every v3 request body; `user_id` only once the app has set one. */
export type RequestIdentity = { device_id: string; user_id?: string };

export const identityFields = (deviceId: string, userId: string | null): RequestIdentity => ({
  device_id: deviceId,
  ...(userId !== null && { user_id: userId }),
});
