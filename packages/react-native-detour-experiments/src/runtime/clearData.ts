import { OUTCOME_OUTBOX_STORAGE_KEY } from "./createEventSink";
import { OUTBOX_STORAGE_KEY, clearLiveOutboxes } from "./eventOutbox";
import { clearRemoteConfigCache, remoteConfigStorageKey } from "./remoteConfigCache";
import { whenRemoteConfigRefreshSettles } from "./remoteConfigFetch";
import { clearSession } from "./session";
import {
  type StorageAdapter,
  removeOwnDeviceId,
  removeStoredItem,
  resolveStorage,
} from "./storage";

export type ClearExperimentsDataOptions = {
  // The `storage` and `appID` of `detourConfig`, when the app passes them.
  storage?: StorageAdapter | undefined;
  appID?: string | undefined;
};

// For withdrawn consent: render the provider with `enabled={false}` first, then call this.
// It drops the queued exposures and outcomes and the cached remote config. The device id stays
// when the Detour SDK is installed, which owns it. Without that SDK it is removed too, with the
// session bucketed by it, so consent given again in the same process starts with a new id.
export async function clearExperimentsData(
  options: ClearExperimentsDataOptions = {},
): Promise<void> {
  const storage = resolveStorage(options.storage);
  const configKey = remoteConfigStorageKey(options.appID);
  // A refresh in flight would store its config after the clear, so it settles first. A request
  // gives up after 8 s. A read of the stored config in flight is dropped by the cache instead.
  await whenRemoteConfigRefreshSettles();
  await Promise.all([
    clearLiveOutboxes(),
    clearRemoteConfigCache(),
    removeFromWebStorage(configKey),
    removeOwnDeviceId(storage).then((removed) => {
      if (removed) clearSession();
    }),
    ...(storage
      ? [
          removeStoredItem(storage, OUTBOX_STORAGE_KEY, "[]"),
          removeStoredItem(storage, OUTCOME_OUTBOX_STORAGE_KEY, "[]"),
          removeStoredItem(storage, configKey, ""),
        ]
      : []),
  ]);
}

function removeFromWebStorage(key: string): Promise<void> {
  try {
    const g = globalThis as { window?: { localStorage?: { removeItem: (key: string) => void } } };
    g.window?.localStorage?.removeItem(key);
  } catch {
    // Blocked storage: nothing to clear.
  }
  return Promise.resolve();
}
