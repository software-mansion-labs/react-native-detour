import { useEffect } from "react";

import { sendAnalytics } from "../analytics/api/send";
import { reevaluateWaiting, setAnalyticsSender } from "../analytics/delivery";
import { getDeviceId } from "../identity/deviceId";
import { getUserId } from "../identity/userId";
import type { DetourStorage } from "../links/types";
import type { DetourRequestConfig } from "../net/types";
import { notifyConsentInputsChange, onConsentInputsChange } from "./changes";
import { isSdkEnabled } from "./killSwitch";
import { refreshSdkConfig } from "./sdkConfig";
import { configureConsentModules } from "./setup";

// Once per launch, so a value changed on the server reaches the app on its next launch.
let hasRefreshedSdkConfig = false;

/**
 * Wires the consent modules and the analytics sender, sends the requests that waited for consent
 * once a consent or config decides them, and refreshes the SDK config once per launch.
 */
export const useConsentSetup = (
  storage: DetourStorage,
  { apiKey, appID, baseUrl }: DetourRequestConfig,
) => {
  useEffect(() => {
    const requestConfig = { apiKey, appID, baseUrl };
    const identity = async () => ({
      deviceId: await getDeviceId(storage),
      userId: await getUserId(),
    });
    configureConsentModules(storage, requestConfig, identity);
    setAnalyticsSender(async (request) => {
      const { deviceId, userId } = await identity();
      await sendAnalytics(request, { config: requestConfig, deviceId, userId });
    });
    const unsubscribe = onConsentInputsChange(reevaluateWaiting);

    if (!hasRefreshedSdkConfig) {
      hasRefreshedSdkConfig = true;
      (async () => {
        // shortcut: with the SDK off, the first launch never fetches, so analytics waits until the
        // next launch even after setEnabled(true); fetch here too if that case matters.
        if (!(await isSdkEnabled())) return;
        await refreshSdkConfig(requestConfig);
        // Also when nothing changed: on a first launch the gates waited for this fetch.
        notifyConsentInputsChange();
      })();
    }

    return () => {
      unsubscribe();
      setAnalyticsSender(null);
    };
  }, [storage, apiKey, appID, baseUrl]);
};
