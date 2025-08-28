import { useEffect, useState } from 'react';
import { checkIsFirstEntrance, markFirstEntrance } from '../utils/appEntrance';
import { getDeferredLink } from '../api/getDeferredLink';

let deferredSessionHandled = false;

export const useDeferredLink = ({
  API_KEY,
}: {
  API_KEY: string;
}): {
  deferredLinkProcessed: boolean;
  deferredLink: string | URL | null;
  route: string | null;
} => {
  const [deferredLinkProcessed, setDeferredProcessed] = useState(false);
  const [matchedLink, setMatchedLink] = useState<string | URL | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (deferredSessionHandled) {
        setDeferredProcessed(true);
        return;
      }
      // mark session handled immediately so remounts won't re-run the logic
      deferredSessionHandled = true;

      const isFirstEntrance = await checkIsFirstEntrance();
      if (!isFirstEntrance) {
        console.log('Not the first entrance, skipping deferred link fetch');
        setDeferredProcessed(true);
        return;
      } else {
        await markFirstEntrance();
      }

      const link = await getDeferredLink(API_KEY);
      if (!link) {
        console.log('No deferred link found');
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
          setRoute(url.pathname + (url.search ?? ''));
        } else {
          // Handle pathname only
          setMatchedLink(link.startsWith('/') ? link : `/${link}`);
        }

        // const currentFullPath = buildCurrentFullPath();

        // if (currentFullPath !== desiredRoute) {
        //   router.replace(desiredRoute as ExternalPathString);
        // }
      } catch (error) {
        console.error(error, link);
      } finally {
        setDeferredProcessed(true);
      }
    })();
  }, [API_KEY]);

  return {
    deferredLinkProcessed,
    deferredLink: matchedLink,
    route,
  };
};
