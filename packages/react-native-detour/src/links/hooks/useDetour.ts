import { useCallback, useEffect, useState } from "react";

import { Linking } from "react-native";

import {
  shouldWaitBeforeFirstMatch,
  whenFirstMatchAllowed,
} from "../../attribution/attributionMode";
import { duringFirstMatch } from "../../attribution/firstMatch";
import { isSdkEnabled } from "../../consent/killSwitch";
import { getDeviceId, reconcileInstall } from "../../identity/deviceId";
import { getUserId } from "../../identity/userId";
import { createSignal } from "../../utils/signal";
import { getDeferredLink } from "../api/getDeferredLink";
import { resolveShortLink } from "../api/resolveShortLink";
import { sendUniversalLinkClick } from "../api/sendUniversalLinkClick";
import type { DetourContextType, DetourLink, LinkType, RequiredConfig } from "../types";
import { checkIsFirstEntrance, markFirstEntrance } from "../utils/appEntrance";
import {
  markReactNavigationInitialUrlProcessed,
  notifyReactNavigationUrl,
} from "../utils/reactNavigation";
import {
  getRestOfPath,
  getRouteFromDeepLink,
  isInfrastructureUrl,
  isWebUrl,
  looksLikeUrl,
  normalizeRawLink,
  parsePathLink,
  searchParamsToRecord,
} from "../utils/urlHelpers";

/**
 * The cold start of this JS session, looked up once. Another run of the effect (StrictMode, a
 * changed config, a second provider) follows the same flags instead of reporting them early.
 */
let coldStart: { readyForUI: Promise<void>; initialLink: Promise<DetourLink> } | null = null;

type ResolveLinkOptions = {
  rawLink: string;
  typeOverride?: LinkType;
  skipClickLimitCheck?: boolean;
};

type InitialLinkParams = RequiredConfig & {
  resolveLink: (options: ResolveLinkOptions) => Promise<DetourLink>;
};

// A Universal/App Link or scheme the app was opened with; skipped only in deferred-only mode.
const findOpenedLink = async ({ storage, linkProcessingMode, resolveLink }: InitialLinkParams) => {
  if (linkProcessingMode === "deferred-only") return undefined;
  const initialUrl = await Linking.getInitialURL();
  if (!initialUrl || isInfrastructureUrl(initialUrl)) return undefined;
  await markFirstEntrance(storage);
  return resolveLink({ rawLink: initialUrl });
};

// The deferred link, on the first launch only.
const findDeferredLink = async (
  { apiKey, appID, shouldUseClipboard, storage, baseUrl, resolveLink }: InitialLinkParams,
  onReadyForUI: () => void,
): Promise<DetourLink> => {
  if (!(await checkIsFirstEntrance(storage))) return null;

  if (await shouldWaitBeforeFirstMatch()) {
    // Ready for the UI first, so the app can still show its consent prompt. React Navigation
    // gets its initial URL (none) now, so it does not wait for consent; a link found later comes
    // as a URL event. The first-launch flag is stored only when matching runs, so an app closed
    // before start() or the consent decision still matches on its next launch.
    onReadyForUI();
    await whenFirstMatchAllowed();
  }

  const deviceId = await getDeviceId(storage);
  const apiLink = await duringFirstMatch(async () => {
    await markFirstEntrance(storage);
    return getDeferredLink({
      apiKey,
      appID,
      shouldUseClipboard,
      baseUrl,
      deviceId,
      userId: await getUserId(),
      isEnabled: await isSdkEnabled(),
    });
  });
  return apiLink ? resolveLink({ rawLink: apiLink, typeOverride: "deferred" }) : null;
};

/**
 * The link the app started with: the opened link, or on the first launch the deferred link.
 * `onReadyForUI` is called before the first match waits for `start()` or consent. Never throws:
 * an error means no link.
 */
const findInitialLink = async (
  params: InitialLinkParams,
  onReadyForUI: () => void,
): Promise<DetourLink> => {
  try {
    // Before the first-launch flag is read or set: storage from another install resets it.
    await reconcileInstall(params.storage);
    const openedLink = await findOpenedLink(params);
    return openedLink !== undefined ? openedLink : await findDeferredLink(params, onReadyForUI);
  } catch (error) {
    console.error("🔗[Detour:ERROR]", error);
    return null;
  }
};

const startColdStart = (params: InitialLinkParams) => {
  const readyForUI = createSignal();
  const initialLink = findInitialLink(params, readyForUI.resolve);
  initialLink.then(() => readyForUI.resolve());
  return { readyForUI: readyForUI.done, initialLink };
};

type ParsedUrl = URL & {
  protocol: string;
  host: string;
  pathname: string;
  search?: string;
};

export const useDetour = ({
  apiKey,
  appID,
  shouldUseClipboard,
  storage,
  linkProcessingMode,
  baseUrl,
}: RequiredConfig): DetourContextType => {
  // One state, so the link is never resolved while the UI is still held.
  const [startup, setStartup] = useState<"pending" | "readyForUI" | "linkResolved">("pending");
  const [link, setLink] = useState<DetourLink>(null);

  const clearLink = useCallback(() => {
    setLink(null);
  }, []);

  const resolveLink = useCallback(
    async ({
      rawLink,
      typeOverride,
      skipClickLimitCheck,
    }: ResolveLinkOptions): Promise<DetourLink> => {
      if (isInfrastructureUrl(rawLink)) {
        console.log("🔗[Detour] Ignored infrastructure URL:", rawLink);
        return null;
      }

      // Handle relative/absolute path strings (e.g. from deferred link API)
      if (!looksLikeUrl(rawLink)) {
        return { ...parsePathLink(rawLink), type: typeOverride ?? "verified" };
      }

      try {
        const urlObj = new URL(normalizeRawLink(rawLink)) as ParsedUrl;

        const isWeb = isWebUrl(rawLink, urlObj);

        if (!isWeb && linkProcessingMode !== "all") {
          return null;
        }

        const detectedType: LinkType = isWeb ? "verified" : "scheme";
        const type = typeOverride ?? detectedType;

        if (!skipClickLimitCheck && isWeb && type !== "deferred") {
          const clickResult = await sendUniversalLinkClick({
            apiKey,
            appID,
            url: rawLink,
            baseUrl,
          });
          if (!clickResult.allowed) {
            console.error("🔗[Detour:CLICK_LIMIT_ERROR] Universal/App link blocked:", {
              url: rawLink,
              error: clickResult.error,
              code: clickResult.code,
              clicksInPeriod: clickResult.clicksInPeriod,
              effectiveLimit: clickResult.effectiveLimit,
            });
            return null;
          }
        }

        if (isWeb) {
          const pathSegments = urlObj.pathname.split("/").filter(Boolean);
          const isSingleSegmentPath =
            pathSegments.length === 1 && pathSegments[0] && pathSegments[0].length > 0;

          // Attempt short link resolution for single-segment paths
          if (isSingleSegmentPath) {
            const resolved = await resolveShortLink({
              apiKey,
              appID,
              url: rawLink,
              baseUrl,
            });
            if (resolved?.link) {
              return resolveLink({ rawLink: resolved.link, skipClickLimitCheck: true });
            }
            console.log("🔗[Detour] Not resolved, using original URL");
          }

          const pathname = getRestOfPath(urlObj.pathname);
          const route = pathname + (urlObj.search ?? "");

          return {
            url: urlObj,
            route,
            pathname,
            params: searchParamsToRecord(urlObj.searchParams),
            type,
          };
        } else {
          // custom schemes
          const route = getRouteFromDeepLink(urlObj);
          const pathname = route.split("?")[0]!;

          return {
            url: urlObj,
            route,
            pathname,
            params: searchParamsToRecord(urlObj.searchParams),
            type,
          };
        }
      } catch (e) {
        const isWeb = isWebUrl(rawLink);
        if (!isWeb && linkProcessingMode !== "all") {
          return null;
        }

        console.warn("🔗[Detour] Failed to parse URL object, falling back to string", e);
        return {
          url: rawLink,
          route: rawLink,
          pathname: rawLink,
          params: {},
          type: typeOverride ?? (isWeb ? "verified" : "scheme"),
        };
      }
    },
    [apiKey, appID, linkProcessingMode, baseUrl],
  );

  // 1. Listen for Universal Links (Running App)
  useEffect(() => {
    if (linkProcessingMode === "deferred-only") {
      return;
    }

    const subscription = Linking.addEventListener("url", async ({ url }) => {
      const resolved = await resolveLink({ rawLink: url });
      if (resolved) {
        notifyReactNavigationUrl(resolved);
        setLink(resolved);
      }
    });
    return () => subscription.remove();
  }, [linkProcessingMode, resolveLink]);

  // 2. Handle Cold Start (Universal vs Deferred)
  useEffect(() => {
    const markReadyForUI = () => {
      markReactNavigationInitialUrlProcessed();
      setStartup((current) => (current === "pending" ? "readyForUI" : current));
    };
    const markInitialLinkResolved = () => {
      markReactNavigationInitialUrlProcessed();
      setStartup("linkResolved");
    };

    if (!apiKey || !appID) {
      markInitialLinkResolved();
      return;
    }

    const isFirstRun = coldStart === null;
    coldStart ??= startColdStart({
      apiKey,
      appID,
      shouldUseClipboard,
      storage,
      linkProcessingMode,
      baseUrl,
      resolveLink,
    });
    coldStart.readyForUI.then(markReadyForUI);
    coldStart.initialLink.then((initialLink) => {
      // Only the run that found it passes it on, so React Navigation gets it once.
      if (isFirstRun && initialLink) {
        notifyReactNavigationUrl(initialLink);
        setLink(initialLink);
      }
      markInitialLinkResolved();
    });
  }, [apiKey, appID, linkProcessingMode, resolveLink, shouldUseClipboard, storage, baseUrl]);

  return {
    isReadyForUI: startup !== "pending",
    isInitialLinkResolved: startup === "linkResolved",
    isLinkProcessed: startup !== "pending",
    link,
    clearLink,
  };
};
