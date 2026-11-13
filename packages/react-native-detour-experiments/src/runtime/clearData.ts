import { OUTCOME_OUTBOX_STORAGE_KEY } from "./createEventSink";
import { OUTBOX_STORAGE_KEY, clearLiveOutboxes } from "./eventOutbox";
import { clearRemoteConfigCache, remoteConfigStorageKey } from "./remoteConfigCache";
import { type StorageAdapter, removeStoredItem, resolveStorage } from "./storage";

export type ClearExperimentsDataOptions = {
  // The `storage` and `appID` of `detourConfig`, when the app passes them.
  storage?: StorageAdapter | undefined;
  appID?: string | undefined;
};

// For withdrawn consent: render the provider with `enabled={false}` first, then call this.
// It drops the queued exposures and outcomes and the cached remote config. The device id stays:
// the Detour SDK owns it.
export async function clearExperimentsData(
  options: ClearExperimentsDataOptions = {},
): Promise<void> {
  const storage = resolveStorage(options.storage);
  const configKey = remoteConfigStorageKey(options.appID);
  await Promise.all([
    clearLiveOutboxes(),
    clearRemoteConfigCache(),
    removeFromWebStorage(configKey),
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
