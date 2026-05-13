import { useCallback, useEffect, useMemo, useRef } from "react";

import type {
  DetourReactNavigationLinking,
  DetourUrlEvent,
  DetourUrlSubscription,
  UseDetourReactNavigationLinkingOptions,
} from "./links/types/index";
import {
  DETOUR_LINKING_PREFIX,
  addReactNavigationEventListener,
  getReactNavigationInitialUrl,
} from "./links/utils/reactNavigation";

export type {
  DetourReactNavigationLinking,
  DetourUrlEvent,
  DetourUrlSubscription,
  UseDetourReactNavigationLinkingOptions,
};

type DetourReactNavigationApi = {
  getInitialURL: () => Promise<string | undefined>;
  addEventListener: (
    event: "url",
    listener: (event: DetourUrlEvent) => void,
  ) => DetourUrlSubscription;
};

export const Detour: DetourReactNavigationApi = {
  getInitialURL: getReactNavigationInitialUrl,
  addEventListener: addReactNavigationEventListener,
};

export const useDetourReactNavigationLinking = <Config>({
  config,
  canHandleUrl = true,
  prefixes = [DETOUR_LINKING_PREFIX],
}: UseDetourReactNavigationLinkingOptions<Config>): DetourReactNavigationLinking<Config> => {
  const listenerRef = useRef<((url: string) => void) | undefined>(undefined);
  const queuedUrlRef = useRef<string | undefined>(undefined);
  const canHandleRef = useRef(canHandleUrl);
  canHandleRef.current = canHandleUrl;

  const emitOrQueue = useCallback((url: string) => {
    if (canHandleRef.current && listenerRef.current) {
      listenerRef.current(url);
      return;
    }

    // Keep only the latest pending link while the app gate is closed.
    queuedUrlRef.current = url;
  }, []);

  useEffect(() => {
    if (!canHandleUrl || !listenerRef.current || !queuedUrlRef.current) {
      return;
    }

    const queuedUrl = queuedUrlRef.current;
    queuedUrlRef.current = undefined;
    listenerRef.current(queuedUrl);
  }, [canHandleUrl]);

  return useMemo<DetourReactNavigationLinking<Config>>(
    () => ({
      prefixes,
      config,
      async getInitialURL() {
        const url = await getReactNavigationInitialUrl();
        if (!url) {
          return undefined;
        }

        if (!canHandleRef.current) {
          queuedUrlRef.current = url;
          return undefined;
        }

        return url;
      },
      subscribe(listener) {
        listenerRef.current = listener;

        if (canHandleRef.current && queuedUrlRef.current) {
          const queuedUrl = queuedUrlRef.current;
          queuedUrlRef.current = undefined;
          listener(queuedUrl);
        }

        const subscription = addReactNavigationEventListener("url", ({ url }) => {
          emitOrQueue(url);
        });

        return () => {
          if (listenerRef.current === listener) {
            listenerRef.current = undefined;
          }
          subscription.remove();
        };
      },
    }),
    [config, emitOrQueue, prefixes],
  );
};

export { DETOUR_LINKING_PREFIX };
