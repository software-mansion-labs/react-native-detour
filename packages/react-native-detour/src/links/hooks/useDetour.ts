import { useCallback, useEffect, useState } from "react";

import { Linking } from "react-native";

import { getDeferredLink } from "../api/getDeferredLink";
import { logClickLimitError, recordUniversalLinkClick } from "../api/recordUniversalLinkClick";
import { resolveShortLink } from "../api/resolveShortLink";
import type { DetourContextType, DetourLink, LinkType, RequiredConfig } from "../types";
import { checkIsFirstEntrance, markFirstEntrance } from "../utils/appEntrance";
import { claimOpenForProvider } from "../utils/linkOpens";
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

type ParsedUrl = URL & {
  protocol: string;
  host: string;
  pathname: string;
  search?: string;
};

const shouldDeliverUniversalLink = async (
  { apiKey, appID }: Pick<RequiredConfig, "apiKey" | "appID">,
  rawLink: string,
): Promise<boolean> => {
  const clickResult = await recordUniversalLinkClick({ apiKey, appID, url: rawLink });

  // Claimed only after the click request: the Expo Router native intent gets the same `url`
  // event and marks the link as its own while this call waits.
  if (!(await claimOpenForProvider(rawLink))) {
    console.log("🔗[Detour] Link already handled for this open, skipped:", rawLink);
    return false;
  }

  if (!clickResult.allowed) {
    logClickLimitError("Universal/App link blocked:", { url: rawLink }, clickResult);
    return false;
  }

  return true;
};

const buildWebLink = (urlObj: ParsedUrl, type: LinkType): DetourLink => {
  const pathname = getRestOfPath(urlObj.pathname);

  return {
    url: urlObj,
    route: pathname + (urlObj.search ?? ""),
    pathname,
    params: searchParamsToRecord(urlObj.searchParams),
    type,
  };
};

const buildSchemeLink = (urlObj: ParsedUrl, type: LinkType): DetourLink => {
  const route = getRouteFromDeepLink(urlObj);

  return {
    url: urlObj,
    route,
    pathname: route.split("?")[0]!,
    params: searchParamsToRecord(urlObj.searchParams),
    type,
  };
};

export const useDetour = ({
  apiKey,
  appID,
  shouldUseClipboard,
  storage,
  linkProcessingMode,
}: RequiredConfig): DetourContextType => {
  const [processed, setProcessed] = useState(false);
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

        if (!isWeb) {
          return buildSchemeLink(urlObj, type);
        }

        if (!skipClickLimitCheck && type !== "deferred") {
          const shouldDeliver = await shouldDeliverUniversalLink({ apiKey, appID }, rawLink);
          if (!shouldDeliver) {
            return null;
          }
        }

        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        const isSingleSegmentPath =
          pathSegments.length === 1 && pathSegments[0] && pathSegments[0].length > 0;

        // Attempt short link resolution for single-segment paths
        if (isSingleSegmentPath) {
          const resolved = await resolveShortLink({
            apiKey,
            appID,
            url: rawLink,
          });
          if (resolved?.link) {
            return resolveLink({ rawLink: resolved.link, skipClickLimitCheck: true });
          }
          console.log("🔗[Detour] Not resolved, using original URL");
        }

        return buildWebLink(urlObj, type);
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
    [apiKey, appID, linkProcessingMode],
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
    if (!apiKey || !appID) {
      markReactNavigationInitialUrlProcessed();
      setProcessed(true);
      return;
    }

    (async () => {
      if (sessionHandled) {
        markReactNavigationInitialUrlProcessed();
        setProcessed(true);
        return;
      }
      sessionHandled = true;

      try {
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

        await markFirstEntrance(storage);

        const apiLink = await getDeferredLink({
          apiKey,
          appID,
          shouldUseClipboard,
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
        markReactNavigationInitialUrlProcessed();
        setProcessed(true);
      }
    })();
  }, [apiKey, appID, linkProcessingMode, resolveLink, shouldUseClipboard, storage]);

  return {
    isLinkProcessed: processed,
    link,
    clearLink,
  };
};
