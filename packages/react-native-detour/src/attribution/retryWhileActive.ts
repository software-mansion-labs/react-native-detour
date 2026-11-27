import { AppState, type NativeEventSubscription } from "react-native";

/**
 * Runs `run` on each visit, when the app comes to the screen, and once more after each of
 * `delaysMs` while `run` asks for it and the app stays there. Leaving the screen stops the retries;
 * the next visit starts the delays from the first one.
 */
export const createRetryWhileActive = (delaysMs: readonly number[], run: () => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let subscription: NativeEventSubscription | null = null;

  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const startVisit = () => {
    retryCount = 0;
    run();
  };

  const retryLater = () => {
    if (timer || AppState.currentState !== "active") return;
    const delay = delaysMs[retryCount];
    if (delay === undefined) return;
    retryCount += 1;
    timer = setTimeout(() => {
      timer = null;
      run();
    }, delay);
  };

  // A remount calls it again; the listener is added once.
  const listen = () => {
    subscription ??= AppState.addEventListener("change", (state) =>
      state === "active" ? startVisit() : stop(),
    );
  };

  return { listen, startVisit, retryLater };
};
