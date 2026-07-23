// In-memory only, reset on every cold start. `ad`/`tracking` self-heal via
// ATT/AAID re-derivation (the OS remembers); manual overrides don't — the
// host must call setConsent() again each cold start for those.
export type Consent = {
  ad?: boolean;
  analytics?: boolean;
  tracking?: boolean;
  source?: "att" | "aaid-optout" | "manual";
  updatedAt?: number;
};

let consent: Consent | undefined;

export const setConsent = (update: Consent): void => {
  consent = { ...consent, ...update, source: update.source ?? "manual", updatedAt: Date.now() };
};

export const applyAutoConsent = (update: Omit<Consent, "updatedAt">): void => {
  if (consent?.source === "manual") return;
  consent = { ...consent, ...update, updatedAt: Date.now() };
};

export const getConsent = (): Consent | undefined => consent;
