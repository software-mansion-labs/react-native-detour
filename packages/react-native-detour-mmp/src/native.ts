import { requireOptionalNativeModule } from "expo-modules-core";

export type CoarseValue = "low" | "medium" | "high";

type DetourAttributionModule = {
  register(): Promise<void>;
  updateConversionValue(fine: number, coarse: CoarseValue | null, lock: boolean): Promise<void>;
  attributionToken(): Promise<string>;
};

// Null on Android, in Expo Go and in a native build made before the package was installed.
const nativeModule = requireOptionalNativeModule<DetourAttributionModule>("DetourAttribution");

/** False where SKAdNetwork cannot be reached, so the provider does nothing there. */
export const isAvailable = nativeModule !== null;

const callNative = async <T>(
  fallback: T,
  failure: string,
  call: (module: DetourAttributionModule) => Promise<T>,
): Promise<T> => {
  if (!nativeModule) return fallback;
  try {
    return await call(nativeModule);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`🔗[Detour:ATTRIBUTION] ${failure}: ${reason}`);
    return fallback;
  }
};

/** Registers the install for SKAdNetwork attribution. True when SKAdNetwork took it. */
export const register = (): Promise<boolean> =>
  callNative(false, "SKAdNetwork registration failed", async (module) => {
    await module.register();
    return true;
  });

/** Sets the conversion value in SKAdNetwork and AdAttributionKit. True when SKAdNetwork took it. */
export const updateConversionValue = (
  fine: number,
  coarse: CoarseValue | null,
  lock: boolean,
): Promise<boolean> =>
  callNative(false, "SKAdNetwork update failed", async (module) => {
    await module.updateConversionValue(fine, coarse, lock);
    return true;
  });

/** The Apple Search Ads token, or null when there is none. */
export const attributionToken = (): Promise<string | null> =>
  callNative<string | null>(null, "Apple Search Ads token unavailable", (module) =>
    module.attributionToken(),
  );
