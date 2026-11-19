import type { DetourConversion } from "../analytics/types/index";
import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import type { SdkPackage } from "../net/types";
import type { DetourAttributionHost, DetourAttributionProvider } from "./types";

// PROVISIONAL: the deferred link waits at most 1 s for the token, then goes without it.
export const ATTRIBUTION_TOKEN_TIMEOUT_MS = 1_000;

let provider: DetourAttributionProvider | null = null;
let hasStarted = false;

/** Set by `configureAttribution`: the provider of the attribution package, or null. */
export const setAttributionProvider = (next: DetourAttributionProvider | null) => {
  if (next === provider) return;
  provider = next;
  hasStarted = false;
};

export const hasAttributionProvider = () => provider !== null;

// It never waits for consent and never fails the caller: a deep link must not be held back,
// so a gate that cannot be read counts as closed.
/** True while consent to attribution passed on this launch lets requests through. */
export const isAttributionAllowed = async (): Promise<boolean> => {
  try {
    return (await decideNow(DetourPurpose.attribution)) === "send";
  } catch {
    return false;
  }
};

// `DetourProvider` mounts again after a remount or a config change; the provider starts once.
export const startAttribution = (host: DetourAttributionHost) => {
  if (hasStarted || !provider) return;
  hasStarted = true;
  provider.didStart(host);
};

/** Runs in the background and never throws, so `logConversion` stays synchronous. */
export const forwardConversion = async (conversion: DetourConversion) => {
  const current = provider;
  try {
    if (!current || !(await isAttributionAllowed())) return;
    current.didLogConversion(conversion);
  } catch (error) {
    console.warn("🔗[Detour:ATTRIBUTION] Conversion not passed to the attribution package:", error);
  }
};

/**
 * The provider's Apple Search Ads token for a request of this package: null for `core`, without a
 * provider, on an error, or with no token within `ATTRIBUTION_TOKEN_TIMEOUT_MS`.
 */
export const attributionTokenFor = async (sdkPackage: SdkPackage): Promise<string | null> => {
  const current = provider;
  if (sdkPackage !== "mmp" || !current) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ATTRIBUTION_TOKEN_TIMEOUT_MS);
  });
  const token = Promise.resolve()
    .then(() => current.attributionToken())
    .catch(() => null);
  try {
    return await Promise.race([token, timeout]);
  } finally {
    clearTimeout(timer);
  }
};
