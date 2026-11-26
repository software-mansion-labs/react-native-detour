import { Platform } from "react-native";

import { requireOptionalNativeModule } from "expo-modules-core";

import type {
  DetourAdvertisingId,
  DetourMetaInstallReferrer,
} from "@swmansion/react-native-detour/attribution";

export type CoarseValue = "low" | "medium" | "high";

type DetourAttributionModule = {
  register(): Promise<void>;
  updateConversionValue(fine: number, coarse: CoarseValue | null, lock: boolean): Promise<void>;
  attributionToken(): Promise<string>;
  missingPostbackCopyKeys(): string[];
  metaInstallReferrer(facebookAppId: string): Promise<DetourMetaInstallReferrer | null>;
  advertisingId(): Promise<string | null>;
};

// Null in Expo Go and in a native build made before the package was installed.
const nativeModule = requireOptionalNativeModule<DetourAttributionModule>("DetourAttribution");
const iosModule = Platform.OS === "ios" ? nativeModule : null;
const androidModule = Platform.OS === "android" ? nativeModule : null;

/** False where SKAdNetwork cannot be reached, so the provider does nothing there. */
export const isAvailable = iosModule !== null;

const callNative = async <T>(
  platformModule: DetourAttributionModule | null,
  fallback: T,
  failure: string,
  call: (module: DetourAttributionModule) => Promise<T>,
): Promise<T> => {
  if (!platformModule) return fallback;
  try {
    return await call(platformModule);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`🔗[Detour:ATTRIBUTION] ${failure}: ${reason}`);
    return fallback;
  }
};

/** Registers the install for SKAdNetwork attribution. True when SKAdNetwork took it. */
export const register = (): Promise<boolean> =>
  callNative(iosModule, false, "SKAdNetwork registration failed", async (module) => {
    await module.register();
    return true;
  });

/** Sets the conversion value in SKAdNetwork and AdAttributionKit. True when SKAdNetwork took it. */
export const updateConversionValue = (
  fine: number,
  coarse: CoarseValue | null,
  lock: boolean,
): Promise<boolean> =>
  callNative(iosModule, false, "SKAdNetwork update failed", async (module) => {
    await module.updateConversionValue(fine, coarse, lock);
    return true;
  });

/** The postback copy keys the app's Info.plist lacks; empty without the native module. */
export const missingPostbackCopyKeys = (): string[] => iosModule?.missingPostbackCopyKeys() ?? [];

/** The Apple Search Ads token, or null when there is none. */
export const attributionToken = (): Promise<string | null> =>
  callNative<string | null>(iosModule, null, "Apple Search Ads token unavailable", (module) =>
    module.attributionToken(),
  );

/** The Meta Install Referrer from the Facebook, Instagram or Facebook Lite app, or null. */
export const metaInstallReferrer = (
  facebookAppId: string,
): Promise<DetourMetaInstallReferrer | null> =>
  callNative<DetourMetaInstallReferrer | null>(
    androidModule,
    null,
    "Meta Install Referrer unavailable",
    (module) => module.metaInstallReferrer(facebookAppId),
  );

/** The IDFA (iOS) or the AAID (Android), or null. */
export const advertisingId = (): Promise<DetourAdvertisingId | null> =>
  callNative<DetourAdvertisingId | null>(
    nativeModule,
    null,
    "Advertising ID unavailable",
    async (module) => {
      const id = await module.advertisingId();
      return id ? { id, type: Platform.OS === "ios" ? "idfa" : "aaid" } : null;
    },
  );

/** The calls into the native module, so tests can pass their own. */
export type NativeAttribution = Pick<
  typeof import("./native"),
  | "isAvailable"
  | "register"
  | "updateConversionValue"
  | "attributionToken"
  | "missingPostbackCopyKeys"
  | "metaInstallReferrer"
  | "advertisingId"
>;
