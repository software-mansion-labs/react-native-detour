import type { DetourConversion } from "../analytics/types/index";
import { decideNow } from "../consent/consentGate";
import { DetourPurpose } from "../consent/purposes";
import type { SdkPackage } from "../net/types";
import type {
  DetourAttributionHost,
  DetourAttributionProvider,
  DetourMetaInstallReferrer,
} from "./types";

// PROVISIONAL: the deferred link waits at most 2 s for the attribution fields, then goes without them.
// A Meta app that is not running took up to 0.9 s to answer on a fast phone.
export const ATTRIBUTION_FIELDS_TIMEOUT_MS = 2_000;

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

// A field for a request of this package from the provider: null for `core`, without a provider,
// on an error, or with no answer within `ATTRIBUTION_FIELDS_TIMEOUT_MS`.
const fieldFromProvider = async <T>(
  sdkPackage: SdkPackage,
  ask: (current: DetourAttributionProvider) => Promise<T | null>,
): Promise<T | null> => {
  const current = provider;
  if (sdkPackage !== "mmp" || !current) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ATTRIBUTION_FIELDS_TIMEOUT_MS);
  });
  const answer = Promise.resolve()
    .then(() => ask(current))
    .catch(() => null);
  try {
    return await Promise.race([answer, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/** The provider's Apple Search Ads token for a request of this package. */
export const attributionTokenFor = (sdkPackage: SdkPackage): Promise<string | null> =>
  fieldFromProvider(sdkPackage, (current) => current.attributionToken());

/** The provider's Meta Install Referrer for a request of this package. */
export const metaInstallReferrerFor = (
  sdkPackage: SdkPackage,
): Promise<DetourMetaInstallReferrer | null> =>
  fieldFromProvider(sdkPackage, (current) => current.metaInstallReferrer());
