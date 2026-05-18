import type { DetourUrlEvent, DetourUrlSubscription } from "./links/types/index";
import {
  DETOUR_LINKING_PREFIX,
  addReactNavigationEventListener,
  getReactNavigationInitialUrl,
} from "./links/utils/reactNavigation";

export type { DetourUrlEvent, DetourUrlSubscription };

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

export { DETOUR_LINKING_PREFIX };
