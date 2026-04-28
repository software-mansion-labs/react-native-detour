import { useCallback, useEffect, useState } from "react";

import { Linking } from "react-native";

import { getDeferredLink } from "../api/getDeferredLink";
import { resolveShortLink } from "../api/resolveShortLink";
import { sendUniversalLinkClick } from "../api/sendUniversalLinkClick";
import type { DetourContextType, DetourLink, LinkType, RequiredConfig } from "../types";
import { checkIsFirstEntrance, markFirstEntrance } from "../utils/appEntrance";
import {
  getRestOfPath,
  getRouteFromDeepLink,
  isInfrastructureUrl,
  isWebUrl,
} from "../utils/urlHelpers";

let sessionHandled = false;

function searchParamsToRecord(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

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
      const isUrl = rawLink.includes("://") || rawLink.startsWith("//");
      if (!isUrl) {
        const path = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
        const [fullPathname = "/", search = ""] = path.split("?");
        const pathname = getRestOfPath(fullPathname);
        const route = pathname + (search ? `?${search}` : "");
        const searchParams = new URLSearchParams(search);

        return {
          url: path,
          route,
          pathname,
          params: searchParamsToRecord(searchParams),
          type: typeOverride ?? "verified",
        };
      }

      try {
        const urlObj = new URL(rawLink);

        const isWeb = isWebUrl(rawLink, urlObj);

        if (!isWeb && linkProcessingMode !== "all") {
          return null;
        }

        const detectedType: LinkType = isWeb ? "verified" : "scheme";
        const type = typeOverride ?? detectedType;

        if (!skipClickLimitCheck && isWeb && type !== "deferred") {
          const clickResult = await sendUniversalLinkClick({ apiKey, appID, url: rawLink });
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
        setLink(resolved);
      }
    });
    return () => subscription.remove();
  }, [linkProcessingMode, resolveLink]);

  // 2. Handle Cold Start (Universal vs Deferred)
  useEffect(() => {
    if (!apiKey || !appID) return;

    (async () => {
      if (sessionHandled) {
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
          if (resolved) setLink(resolved);
        }
      } catch (error) {
        console.error("🔗[Detour:ERROR]", error);
      } finally {
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
