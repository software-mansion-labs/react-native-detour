import type { DetourLink, DetourUrlEvent, DetourUrlSubscription, LinkType } from "../types/index";

export const DETOUR_LINKING_PREFIX = "detour://";

type DetourUrlListener = (event: DetourUrlEvent) => void;

const listeners = new Set<DetourUrlListener>();

let initialProcessingFinished = false;
let pendingInitialUrl: string | undefined;
const initialUrlWaiters: Array<(url: string | undefined) => void> = [];

const buildReactNavigationUrl = (route: string, linkType: LinkType) => {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  const [pathname = "/", ...searchParts] = normalizedRoute.split("?");
  const search = searchParts.join("?");
  const params = new URLSearchParams(search);

  params.append("fromDeepLink", "true");
  params.append("linkType", linkType);

  const query = params.toString();
  const path = pathname.replace(/^\//, "");

  return `${DETOUR_LINKING_PREFIX}${path}${query ? `?${query}` : ""}`;
};

const emitUrlEvent = (url: string) => {
  for (const listener of listeners) {
    listener({ url });
  }
};

export const notifyReactNavigationUrl = (link: Exclude<DetourLink, null>) => {
  const url = buildReactNavigationUrl(link.route, link.type);

  if (!initialProcessingFinished) {
    if (pendingInitialUrl === undefined || listeners.size === 0) {
      pendingInitialUrl = url;
      return;
    }
  }

  emitUrlEvent(url);
};

export const markReactNavigationInitialUrlProcessed = () => {
  if (initialProcessingFinished) {
    return;
  }

  initialProcessingFinished = true;
  if (initialUrlWaiters.length === 0) {
    return;
  }

  const url = consumePendingInitialUrl();
  for (const resolve of initialUrlWaiters) {
    resolve(url);
  }
  initialUrlWaiters.length = 0;
};

const consumePendingInitialUrl = () => {
  const url = pendingInitialUrl;
  pendingInitialUrl = undefined;
  return url;
};

export const getReactNavigationInitialUrl = async (): Promise<string | undefined> => {
  if (initialProcessingFinished) {
    return consumePendingInitialUrl();
  }

  return await new Promise((resolve) => {
    initialUrlWaiters.push(resolve);
  });
};

export const addReactNavigationEventListener = (
  _event: "url",
  listener: DetourUrlListener,
): DetourUrlSubscription => {
  listeners.add(listener);

  return {
    remove: () => {
      listeners.delete(listener);
    },
  };
};
