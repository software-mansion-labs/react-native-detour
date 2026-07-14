// In-memory only, by design: same convention as userIdentity.ts — the host
// app owns its own consent UI/state and is expected to call setConsent()
// again on every cold start once the user's choice is known.
export type Consent = {
  ad?: boolean;
  analytics?: boolean;
  tracking?: boolean;
};

let consent: Consent | undefined;

// Merges into the existing state so the host can update one flag (e.g.
// tracking, right after an ATT prompt resolves) without re-supplying the rest.
export const setConsent = (update: Consent): void => {
  consent = { ...consent, ...update };
};

export const getConsent = (): Consent | undefined => consent;
