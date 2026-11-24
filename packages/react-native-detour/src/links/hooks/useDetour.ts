import { useCallback, useEffect, useState } from "react";

import { Linking } from "react-native";

import {
  shouldWaitBeforeFirstMatch,
  whenFirstMatchAllowed,
} from "../../attribution/attributionMode";
import { isSdkEnabled } from "../../consent/killSwitch";
import { getDeviceId, reconcileInstall } from "../../identity/deviceId";
import { getUserId } from "../../identity/userId";
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

let sessionHandled = false;
// Resolved when the first run finds the initial link. A second run of the effect (StrictMode, a
// changed config) waits for it, so it never reports a final `null` while the match still runs.
let markSessionResolved = () => {};
const sessionResolved = new Promise<void>((resolve) => {
  markSessionResolved = resolve;
});

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
    }: {
      rawLink: string;
      typeOverride?: LinkType;
      skipClickLimitCheck?: boolean;
    }): Promise<DetourLink> => {
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

    (async () => {
      if (sessionHandled) {
        markReadyForUI();
        await sessionResolved;
        markInitialLinkResolved();
        return;
      }
      sessionHandled = true;

      try {
        // Before the first-launch flag is read or set: storage from another install resets it.
        await reconcileInstall(storage);

        // STEP A: Universal/App Link (skipped only in deferred-only mode)
        if (linkProcessingMode !== "deferred-only") {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && !isInfrastructureUrl(initialUrl)) {
            await markFirstEntrance(storage);
            const resolved = await resolveLink({ rawLink: initialUrl });
            if (resolved) {
              notifyReactNavigationUrl(resolved);
              setLink(resolved);
            }
            return;
          }
        }

        // STEP B: Deferred Link
        const isFirstEntrance = await checkIsFirstEntrance(storage);
        if (!isFirstEntrance) return;

        if (await shouldWaitBeforeFirstMatch()) {
          // Ready for the UI first, so the app can still show its consent prompt. React Navigation
          // gets its initial URL (none) now, so it does not wait for consent; a link found later
          // comes as a URL event. The first-launch flag is stored only when matching runs, so an
          // app closed before start() or the consent decision still matches on its next launch.
          markReadyForUI();
          await whenFirstMatchAllowed();
        }

        const deviceId = await getDeviceId(storage);
        await markFirstEntrance(storage);

        const apiLink = await getDeferredLink({
          apiKey,
          appID,
          shouldUseClipboard,
          baseUrl,
          deviceId,
          userId: await getUserId(),
          isEnabled: await isSdkEnabled(),
        });

        if (apiLink) {
          const resolved = await resolveLink({ rawLink: apiLink, typeOverride: "deferred" });
          if (resolved) {
            notifyReactNavigationUrl(resolved);
            setLink(resolved);
          }
        }
      } catch (error) {
        console.error("🔗[Detour:ERROR]", error);
      } finally {
        markSessionResolved();
        markInitialLinkResolved();
      }
    })();
  }, [apiKey, appID, linkProcessingMode, resolveLink, shouldUseClipboard, storage, baseUrl]);

  return {
    isReadyForUI: startup !== "pending",
    isInitialLinkResolved: startup === "linkResolved",
    link,
    clearLink,
  };
};
