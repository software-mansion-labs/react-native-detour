import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { getDeferredLink } from '../api/getDeferredLink';
import { resolveShortLink } from '../api/resolveShortLink';
import type { DetourContextType, LinkType, RequiredConfig } from '../types';
import { checkIsFirstEntrance, markFirstEntrance } from '../utils/appEntrance';
import {
  getRestOfPath,
  getRouteFromDeepLink,
  isInfrastructureUrl,
  isWebUrl,
} from '../utils/urlHelpers';

let sessionHandled = false;

type ReturnType = DetourContextType;

export const useDetour = ({
  API_KEY,
  appID,
  shouldUseClipboard,
  handleSchemeLinks,
  storage,
}: RequiredConfig): ReturnType => {
  const [processed, setProcessed] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | URL | null>(null);
  const [route, setRoute] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<LinkType | null>(null);

  const clearLink = useCallback(() => {
    setLinkUrl(null);
    setRoute(null);
    setLinkType(null);
  }, []);

  // Unified helper for parsing any link (API or Native)
  const processLink = useCallback(
    async (rawLink: string, typeOverride?: LinkType) => {
      if (isInfrastructureUrl(rawLink)) {
        console.log('🔗[Detour] Ignored infrastructure URL:', rawLink);
        return;
      }

      const isUrl = rawLink.includes('://') || rawLink.startsWith('//');

      // Early return for standard relative/absolute path strings
      if (!isUrl) {
        const path = rawLink.startsWith('/') ? rawLink : `/${rawLink}`;
        setLinkUrl(path);
        setRoute(path);
        return;
      }

      try {
        const urlObj = new URL(rawLink);

        // Determine if it's a web URL (requiring app hash stripping)
        // or a custom deep link scheme
        const isWeb = isWebUrl(rawLink, urlObj);

        if (!isWeb && !handleSchemeLinks) {
          return;
        }

        setLinkUrl(urlObj);

        const detectedType: LinkType = isWeb ? 'verified' : 'scheme';
        setLinkType(typeOverride ?? detectedType);

        if (isWeb) {
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const isSingleSegmentPath =
            pathSegments.length === 1 &&
            pathSegments[0] &&
            pathSegments[0].length > 0;

          // Attempt short link resolution for single-segment paths
          if (isSingleSegmentPath) {
            const resolved = await resolveShortLink({
              API_KEY,
              appID,
              url: rawLink,
            });
            if (resolved?.link) {
              await processLink(resolved.link);
              return;
            }
            console.log('🔗[Detour] Not resolved, using original URL');
          }
          const pathNameWithoutAppHash = getRestOfPath(urlObj.pathname);
          setRoute(pathNameWithoutAppHash + (urlObj.search ?? ''));
        } else {
          // custom schemes
          const deepLinkRoute = getRouteFromDeepLink(urlObj);
          setRoute(deepLinkRoute);
        }
      } catch (e) {
        const isWeb = isWebUrl(rawLink);
        if (!isWeb && !handleSchemeLinks) {
          return;
        }

        console.warn(
          '🔗[Detour] Failed to parse URL object, falling back to string',
          e
        );
        setLinkUrl(rawLink);
        setRoute(rawLink);
        setLinkType(typeOverride ?? (isWeb ? 'verified' : 'scheme'));
      }
    },
    [API_KEY, appID, handleSchemeLinks]
  );

  // 1. Listen for Universal Links (Running App)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processLink(url);
    });
    return () => subscription.remove();
  }, [processLink]);

  // 2. Handle Cold Start (Universal vs Deferred)
  useEffect(() => {
    if (!API_KEY || !appID) return;

    (async () => {
      if (sessionHandled) {
        setProcessed(true);
        return;
      }
      sessionHandled = true;

      try {
        // STEP A: Universal Link
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && !isInfrastructureUrl(initialUrl)) {
          await markFirstEntrance(storage);
          await processLink(initialUrl);
          return;
        }

        // STEP B: Deferred Link
        const isFirstEntrance = await checkIsFirstEntrance(storage);
        if (!isFirstEntrance) return;

        await markFirstEntrance(storage);

        const apiLink = await getDeferredLink({
          API_KEY,
          appID,
          shouldUseClipboard,
        });

        if (apiLink) {
          await processLink(apiLink, 'deferred');
        }
      } catch (error) {
        console.error('🔗[Detour:ERROR]', error);
      } finally {
        setProcessed(true);
      }
    })();
  }, [API_KEY, appID, processLink, shouldUseClipboard, storage]);

  return {
    isLinkProcessed: processed,
    linkUrl: linkUrl,
    linkRoute: route,
    linkType,
    clearLink,
  };
};
