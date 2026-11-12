import type { DetourStorage } from "../links/types";
import { StorageKeys, removeStoredItem } from "../links/utils/storage";
import { detourFetch } from "../net/client";
import type { DetourRequestConfig } from "../net/types";
import { notifyConsentInputsChange } from "./changes";

type Outcome = "confirmed" | "retry" | "stop";
type State = { enabled: boolean; reportedEnabled: boolean; changedAt: number | null };

export const FIRST_RETRY_DELAY_MS = 5_000;
export const MAX_RETRY_DELAY_MS = 300_000;
// The server stops writing about 28 s after a request starts, so a request given up
// after 60 s can no longer land after the next one.
const DISABLE_TIMEOUT_MS = 60_000;

let storage: DetourStorage | null = null;
let requestConfig: DetourRequestConfig | null = null;
let getDeviceId: (() => Promise<string>) | null = null;
let state: State | null = null;
let enabledThisLaunch: { enabled: boolean; at: number } | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const loadState = async (): Promise<State> => {
  if (state) return state;
  const [enabled, reportedEnabled, changedAt] = await Promise.all([
    storage?.getItem(StorageKeys.ENABLED_KEY),
    storage?.getItem(StorageKeys.REPORTED_ENABLED_KEY),
    storage?.getItem(StorageKeys.ENABLED_CHANGED_AT_KEY),
  ]);
  state ??= {
    enabled: enabled !== "false",
    // A new install is enabled on the server too.
    reportedEnabled: reportedEnabled !== "false",
    changedAt: changedAt ? Number(changedAt) : null,
  };
  return state;
};

const saveState = async (next: State) => {
  state = next;
  try {
    await storage?.setItem(StorageKeys.ENABLED_KEY, String(next.enabled));
    await storage?.setItem(StorageKeys.REPORTED_ENABLED_KEY, String(next.reportedEnabled));
    if (next.changedAt !== null) {
      await storage?.setItem(StorageKeys.ENABLED_CHANGED_AT_KEY, String(next.changedAt));
    }
  } catch (error) {
    console.warn("🔗[Detour:KILL_SWITCH] Failed to save the kill switch:", error);
  }
};

export const isSdkEnabled = async (): Promise<boolean> =>
  enabledThisLaunch?.enabled ?? (storage ? (await loadState()).enabled : true);

const send = async (enabled: boolean, at: number): Promise<Outcome> => {
  if (!requestConfig || !getDeviceId) return "stop";
  try {
    const response = await detourFetch("sdkDisable", {
      config: requestConfig,
      body: {
        device_id: await getDeviceId(),
        disabled: !enabled,
        timestamp: new Date(at).toISOString(),
      },
      timeoutMs: DISABLE_TIMEOUT_MS,
    });
    if (response === null) return "stop";
    if (response.ok) return "confirmed";
    if (response.status === 429 || response.status >= 500) return "retry";
    console.error(
      `🔗[Detour:KILL_SWITCH] sdk/disable rejected: ${response.status}; sent again on the next launch.`,
    );
    return "stop";
  } catch {
    return "retry";
  }
};

/** Sends the stored state until the server confirms it. */
export const reportKillSwitch = async () => {
  let retryDelay = FIRST_RETRY_DELAY_MS;
  while (true) {
    const current = await loadState();
    if (current.enabled === current.reportedEnabled) return;
    const outcome = await send(current.enabled, current.changedAt ?? Date.now());
    if (outcome === "stop") return;
    if (outcome === "retry") {
      await sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
      continue;
    }
    // A change made while the request was out is still unreported, so the loop sends it next.
    await saveState({ ...(await loadState()), reportedEnabled: current.enabled });
    retryDelay = FIRST_RETRY_DELAY_MS;
  }
};

// One request at a time (API contract, kill switch): the server keeps the state that arrived
// last. An unconfirmed state is sent again on the next launch, because a lost "off" would leave
// the install in ad network postbacks.
let running: Promise<void> | null = null;
let runAgain = false;

const syncKillSwitch = () => {
  if (running) {
    runAgain = true;
    return;
  }
  running = (async () => {
    try {
      do {
        runAgain = false;
        await reportKillSwitch();
      } while (runAgain);
    } catch (error) {
      console.warn("🔗[Detour:KILL_SWITCH] Failed to report the kill switch:", error);
    } finally {
      running = null;
    }
  })();
};

// Applies at once for this launch; written to storage once DetourProvider mounts.
const applyEnabled = async () => {
  if (!storage) return;
  if (enabledThisLaunch) {
    const current = await loadState();
    if (current.enabled !== enabledThisLaunch.enabled) {
      await saveState({
        ...current,
        enabled: enabledThisLaunch.enabled,
        changedAt: enabledThisLaunch.at,
      });
    }
  }
  syncKillSwitch();
};

/**
 * `false` turns the SDK off for this install, also on later launches, until `setEnabled(true)`.
 * While off it sends nothing: no analytics, sessions, conversions, consent or matching by device
 * signals. Links the user taps are still routed, and on Android a click ID from the Play install
 * referrer still matches the deferred link, without the device ID. The device ID does not change.
 */
export const setEnabled = (enabled: boolean) => {
  enabledThisLaunch = { enabled, at: Date.now() };
  // Drops what waited for consent when the SDK goes off.
  notifyConsentInputsChange();
  applyEnabled();
};

export const configureKillSwitch = (
  userStorage: DetourStorage,
  config: DetourRequestConfig,
  deviceId: () => Promise<string>,
) => {
  if (storage !== userStorage) state = null;
  storage = userStorage;
  requestConfig = config;
  getDeviceId = deviceId;
  applyEnabled();
};

/** A storage restored from another install loses the kill switch together with the device ID. */
export const resetKillSwitch = async (userStorage: DetourStorage) => {
  state = null;
  await Promise.all(
    [
      StorageKeys.ENABLED_KEY,
      StorageKeys.REPORTED_ENABLED_KEY,
      StorageKeys.ENABLED_CHANGED_AT_KEY,
    ].map((key) => removeStoredItem(userStorage, key)),
  );
};
