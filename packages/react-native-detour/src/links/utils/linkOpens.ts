import { createLinkRegistry } from "./linkRegistry";

// DetourProvider can mount a few seconds after the native intent handled the cold-start link.
const NATIVE_INTENT_WINDOW_MS = 10_000;
// A repeat this soon is the same tap delivered twice, for example as two `url` events on iOS.
// A later one is the user tapping the link again.
const SAME_TAP_WINDOW_MS = 1000;

type LinkOpen = { openedBy: "native-intent"; handled: Promise<boolean> } | { openedBy: "provider" };

// The Expo Router native intent in resolve mode and DetourProvider can both get the same link.
// Only one of them should open it in the app.
const linkOpens = createLinkRegistry<LinkOpen>(NATIVE_INTENT_WINDOW_MS);

/**
 * Called by the native intent in resolve mode before its first await. `handled` is false when
 * it could not route the link and fell back to `fallbackPath`, so DetourProvider delivers it.
 */
export const markOpenedByNativeIntent = (url: string, handled: Promise<boolean>) => {
  linkOpens.set(url, { openedBy: "native-intent", handled });
};

/**
 * Tells DetourProvider whether to deliver the link. When it should, the link is marked as
 * delivered, so a repeat of the same tap is skipped.
 */
export const claimOpenForProvider = async (url: string): Promise<boolean> => {
  const nativeIntentOpen = linkOpens.get(url);
  if (
    nativeIntentOpen?.value.openedBy === "native-intent" &&
    (await nativeIntentOpen.value.handled)
  ) {
    return false;
  }

  // Read again: another `url` event for this link may have been claimed during the wait.
  const earlierOpen = linkOpens.get(url);
  if (earlierOpen?.value.openedBy === "provider" && earlierOpen.ageMs < SAME_TAP_WINDOW_MS) {
    return false;
  }

  linkOpens.set(url, { openedBy: "provider" });
  return true;
};

/** Lets tests start from a clean state. */
export const forgetLinkOpens = () => linkOpens.clear();
