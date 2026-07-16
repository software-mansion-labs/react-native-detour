// In-memory only, by design: same convention as userIdentity.ts — the host
// app owns its own consent UI/state and is expected to call setConsent()
// again on every cold start once the user's choice is known.
export type Consent = {
  ad?: boolean;
  analytics?: boolean;
  tracking?: boolean;
  source?: "att" | "aaid-optout" | "manual";
  updatedAt?: number;
};

let consent: Consent | undefined;

// Merges into the existing state so the host can update one flag (e.g.
// tracking, right after an ATT prompt resolves) without re-supplying the rest.
// `source` defaults to "manual" when omitted — internal auto-derivation
// (ATT/AAID) always passes its own explicit source, so an omitted source
// means this call came directly from the host.
export const setConsent = (update: Consent): void => {
  consent = { ...consent, ...update, source: update.source ?? "manual", updatedAt: Date.now() };
};

export const getConsent = (): Consent | undefined => consent;
