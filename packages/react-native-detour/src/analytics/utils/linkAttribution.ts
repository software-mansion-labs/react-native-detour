import type { DetourStorage } from "../../links/types";
import { StorageKeys } from "../../links/utils/storage";

export type OpenType = "deferred" | "verified" | "scheme" | "organic";

export type LinkAttribution = {
  install_click_id: string | null;
  open_click_id: string | null;
  open_type: OpenType;
};

// The opening link lives in memory, for this run only; the install link is
// stored for good.
let openClickId: string | null = null;
let openType: OpenType = "organic";
let installClickId: string | null | undefined;

export const recordDeferredOpen = async (storage: DetourStorage, clickId: string) => {
  installClickId = clickId;
  openClickId = clickId;
  openType = "deferred";
  try {
    await storage.setItem(StorageKeys.INSTALL_CLICK_ID_KEY, clickId);
  } catch (error) {
    console.warn("🔗[Detour:STORAGE_ERROR] Failed to save the install link:", error);
  }
};

export const recordLinkOpen = (clickId: string) => {
  openClickId = clickId;
  openType = "verified";
};

export const recordBlockedLinkOpen = () => {
  openClickId = null;
  openType = "verified";
};

// Custom schemes also carry OAuth returns, so they never replace a Detour link.
export const recordSchemeOpen = () => {
  if (openClickId === null) openType = "scheme";
};

export const getLinkAttribution = async (storage: DetourStorage): Promise<LinkAttribution> => {
  if (installClickId === undefined) {
    try {
      installClickId = (await storage.getItem(StorageKeys.INSTALL_CLICK_ID_KEY)) ?? null;
    } catch {
      installClickId = null;
    }
  }
  return {
    install_click_id: installClickId,
    open_click_id: openClickId,
    open_type: openType,
  };
};
