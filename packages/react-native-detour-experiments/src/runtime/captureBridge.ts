import type { ExperimentKey, Variant } from "../types";
import { isDevRuntime } from "./environment";

const FORCE_PARAM = "detour_experiments_force";

// The only validation between an untrusted deep link and `forcedVariants`. Never remove it.
const VARIANT_LETTER_RE = /^[A-Z]$/;

export function parseForcedVariants(url: string): Record<ExperimentKey, Variant> {
  const forced: Record<ExperimentKey, Variant> = {};
  const query = url.split("?")[1];
  if (!query) return forced;

  for (const pair of query.split("&")) {
    const [rawName, rawValue] = pair.split("=");
    if (rawName === undefined || rawValue === undefined) continue;
    if (decodeURIComponent(rawName) !== FORCE_PARAM) continue;

    const [key, variant] = decodeURIComponent(rawValue).split(":");
    if (!key) continue;
    if (variant && VARIANT_LETTER_RE.test(variant)) forced[key] = variant;
  }
  return forced;
}

type LinkingLike = {
  getInitialURL: () => Promise<string | null>;
  addEventListener: (
    type: "url",
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
};

// Development builds only: a build that does not define `__DEV__` counts as production.
export function subscribeToForcedVariants(
  apply: (forced: Record<ExperimentKey, Variant>) => void,
): () => void {
  if (!isDevRuntime()) return () => {};

  let linking: LinkingLike | undefined;
  try {
    const rn = require("react-native") as { Linking?: LinkingLike };
    linking = rn.Linking;
  } catch {
    return () => {};
  }
  if (!linking) return () => {};

  let cancelled = false;
  const handle = (url: string | null | undefined) => {
    if (cancelled || !url) return;
    const forced = parseForcedVariants(url);
    if (Object.keys(forced).length > 0) apply(forced);
  };

  linking
    .getInitialURL()
    .then(handle)
    .catch((err: unknown) => {
      console.warn(
        `[Detour Experiments] Could not read the initial capture URL: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  const subscription = linking.addEventListener("url", (event) => handle(event.url));

  return () => {
    cancelled = true;
    subscription.remove();
  };
}
