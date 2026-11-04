import type { DetourStorage } from "../links/types";
import type { DetourRequestConfig } from "../net/client";
import { configureConsent } from "./consent";
import { configureKillSwitch } from "./killSwitch";
import { configureSdkConfig } from "./sdkConfig";

type Identity = () => Promise<{ deviceId: string; userId: string | null }>;

/**
 * The kill switch goes first: a consent passed before `DetourProvider` mounted is sent only when
 * the SDK is on.
 */
export const configureConsentModules = (
  storage: DetourStorage,
  requestConfig: DetourRequestConfig,
  identity: Identity,
) => {
  configureKillSwitch(storage, requestConfig, async () => (await identity()).deviceId);
  configureConsent(storage, requestConfig, identity);
  configureSdkConfig(storage, requestConfig.appID);
};
