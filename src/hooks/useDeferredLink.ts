import { useEffect, useState } from 'react';
import { getDeferredLink } from '../api/getDeferredLink';
import type { DetourContextType, RequiredConfig } from '../types';
import { checkIsFirstEntrance, markFirstEntrance } from '../utils/appEntrance';
import { getRestOfPath } from '../utils/urlHelpers';

let deferredSessionHandled = false;

type ReturnType = DetourContextType;

export const useDeferredLink = ({
  API_KEY,
  appID,
  shouldUseClipboard,
}: RequiredConfig): ReturnType => {
  const [deferredLinkProcessed, setDeferredProcessed] = useState(false);
  const [matchedLink, setMatchedLink] = useState<string | URL | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY || !appID) return;

    (async () => {
      if (deferredSessionHandled) {
        setDeferredProcessed(true);
        return;
      }
      // mark session handled immediately so remounts won't re-run the logic
      deferredSessionHandled = true;

      const isFirstEntrance = await checkIsFirstEntrance();
      if (!isFirstEntrance) {
        setDeferredProcessed(true);
        return;
      } else {
        await markFirstEntrance();
      }

      const link = await getDeferredLink({
        API_KEY,
        appID,
        shouldUseClipboard,
      });
      if (!link) {
        setDeferredProcessed(true);
        setMatchedLink(null);
        return;
      }

      try {
        if (
          link.startsWith('http://') ||
          link.startsWith('https://') ||
          link.startsWith('//')
        ) {
          // Handle full URL
          const url = new URL(link);
          setMatchedLink(url);

          const pathNameWithoutAppHash = getRestOfPath(url.pathname);
          setRoute(pathNameWithoutAppHash + (url.search ?? ''));
        } else {
          // Handle pathname only
          setMatchedLink(link.startsWith('/') ? link : `/${link}`);
        }
      } catch (error) {
        console.error('🔗[Detour:TYPE_ERROR] ' + error, link);
      } finally {
        setDeferredProcessed(true);
      }
    })();
  }, [API_KEY, appID, shouldUseClipboard]);

  return {
    deferredLinkProcessed,
    deferredLink: matchedLink,
    route,
  };
};
