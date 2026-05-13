import { useEffect, useMemo, useRef } from "react";

import type { LinkingOptions } from "@react-navigation/native";

import { DETOUR_LINKING_PREFIX, Detour } from "@swmansion/react-native-detour";

import { type RootStackParamList, linkingConfig } from "./navigation";

export const useDetourLinkingBridge = (canHandleDetourLink: boolean) => {
  const listenerRef = useRef<((url: string) => void) | undefined>(undefined);
  const queuedUrlRef = useRef<string | undefined>(undefined);
  const canHandleRef = useRef(canHandleDetourLink);
  canHandleRef.current = canHandleDetourLink;

  const emitOrQueue = (url: string) => {
    if (canHandleRef.current && listenerRef.current) {
      listenerRef.current(url);
      return;
    }

    // Keep only the latest pending link while auth gate is closed.
    queuedUrlRef.current = url;
  };

  useEffect(() => {
    if (!canHandleDetourLink || !listenerRef.current || !queuedUrlRef.current) {
      return;
    }

    const queuedUrl = queuedUrlRef.current;
    queuedUrlRef.current = undefined;
    listenerRef.current(queuedUrl);
  }, [canHandleDetourLink]);

  const linking = useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: [DETOUR_LINKING_PREFIX],
      config: linkingConfig,
      async getInitialURL() {
        const url = await Detour.getInitialURL();
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

        const subscription = Detour.addEventListener("url", ({ url }) => {
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
    [],
  );

  return { linking };
};
