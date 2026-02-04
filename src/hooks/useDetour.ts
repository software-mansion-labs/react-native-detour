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
} from '../utils/urlHelpers';

let sessionHandled = false;

type ReturnType = DetourContextType;

export const useDetour = ({
  API_KEY,
  appID,
  shouldUseClipboard,
  storage,
}: RequiredConfig): ReturnType => {
  const [processed, setProcessed] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | URL | null>(null);
  const [route, setRoute] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<LinkType | null>(null);

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
        setLinkUrl(urlObj);

        // Determine if it's a web URL (requiring app hash stripping)
        // or a custom deep link scheme
        const isWebUrl =
          urlObj.protocol === 'http:' ||
          urlObj.protocol === 'https:' ||
          rawLink.startsWith('//');

        const detectedType: LinkType = isWebUrl ? 'verified' : 'scheme';
        setLinkType(typeOverride ?? detectedType);

        if (isWebUrl) {
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const lastSegment = pathSegments[pathSegments.length - 1];

          if (lastSegment && lastSegment.length > 0) {
            try {
              const resolved = await resolveShortLink({
                API_KEY,
                appID,
                url: rawLink,
              });
              if (resolved?.link) {
                await processLink(resolved.link);
                return;
              }
            } catch (e) {
              console.warn('🔗[Detour] Failed to resolve short link', e);
            }
          }
          const pathNameWithoutAppHash = getRestOfPath(urlObj.pathname);
          setRoute(pathNameWithoutAppHash + (urlObj.search ?? ''));
        } else {
          // custom schemes
          const deepLinkRoute = getRouteFromDeepLink(urlObj);
          setRoute(deepLinkRoute);
        }
      } catch (e) {
        console.warn(
          '🔗[Detour] Failed to parse URL object, falling back to string',
          e
        );
        setLinkUrl(rawLink);
        setRoute(rawLink);
        setLinkType(typeOverride ?? 'scheme');
      }
    },
    [API_KEY, appID]
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
  };
};
