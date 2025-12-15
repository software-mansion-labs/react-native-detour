import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { getDeferredLink } from '../api/getDeferredLink';
import type { DetourContextType, RequiredConfig } from '../types';
import { checkIsFirstEntrance, markFirstEntrance } from '../utils/appEntrance';
import { getRestOfPath, isInfrastructureUrl } from '../utils/urlHelpers';

let sessionHandled = false;

type ReturnType = DetourContextType;

export const useDetour = ({
  API_KEY,
  appID,
  shouldUseClipboard,
}: RequiredConfig): ReturnType => {
  const [processed, setProcessed] = useState(false);
  const [link, setLink] = useState<string | URL | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  // Unified helper for parsing any link (API or Native)
  const processLink = (rawLink: string) => {
    if (isInfrastructureUrl(rawLink)) {
      console.log('🔗[Detour] Ignored infrastructure URL:', rawLink);
      return;
    }

    // Basic check for full URL structure
    if (
      rawLink.startsWith('http://') ||
      rawLink.startsWith('https://') ||
      rawLink.startsWith('//')
    ) {
      try {
        const urlObj = new URL(rawLink);
        setLink(urlObj);

        const pathNameWithoutAppHash = getRestOfPath(urlObj.pathname);
        setRoute(pathNameWithoutAppHash + (urlObj.search ?? ''));
      } catch (e) {
        console.warn(
          '🔗[Detour] Failed to parse URL object, falling back to string',
          e
        );
        setLink(rawLink);
        setRoute(rawLink);
      }
    } else {
      const path = rawLink.startsWith('/') ? rawLink : `/${rawLink}`;
      setLink(path);
      setRoute(path);
    }
  };

  // 1. Listen for Universal Links (Running App)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processLink(url);
    });
    return () => subscription.remove();
  }, []);

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
          await markFirstEntrance();
          processLink(initialUrl);
          return;
        }

        // STEP B: Deferred Link
        const isFirstEntrance = await checkIsFirstEntrance();
        if (!isFirstEntrance) return;

        await markFirstEntrance();

        const apiLink = await getDeferredLink({
          API_KEY,
          appID,
          shouldUseClipboard,
        });

        if (apiLink) {
          processLink(apiLink);
        }
      } catch (error) {
        console.error('🔗[Detour:ERROR]', error);
      } finally {
        setProcessed(true);
      }
    })();
  }, [API_KEY, appID, shouldUseClipboard]);

  return {
    deferredLinkProcessed: processed,
    deferredLink: link,
    route,
  };
};
