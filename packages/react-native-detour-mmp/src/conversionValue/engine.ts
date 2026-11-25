import type { DetourConversion } from "@swmansion/react-native-detour";
import type { DetourAttributionHost } from "@swmansion/react-native-detour/attribution";

import type { NativeAttribution } from "../native";
import { type ConversionValueSchema, EMPTY_SCHEMA, bestRule, parseSchema } from "./schema";
import { loadSchema, loadState, saveSchema, saveState } from "./store";

/** SKAdNetwork registration and conversion values from the server's schema. */
export const createConversionValueEngine = (native: NativeAttribution) => {
  let schema: ConversionValueSchema = EMPTY_SCHEMA;
  let etag: string | null = null;

  // Storage reads and writes are async, so two conversions in a row could lose a count or send
  // a lower value after a higher one. Every step that reads or writes the state runs here, in order.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (step: () => Promise<void>) => {
    queue = queue.then(step).catch((error) => {
      console.warn("🔗[Detour:ATTRIBUTION] Conversion value step failed:", error);
    });
    return queue;
  };

  // On the first launch with consent, so the install counts for SKAdNetwork attribution. Marked
  // only once SKAdNetwork took it, so a failed attempt runs again on the next start or conversion.
  // It runs in the queue, so on iOS 15.4+ its value 0 always lands before a conversion value.
  const registerIfAllowed = async (host: DetourAttributionHost) => {
    if (!(await host.isAttributionAllowed())) return;
    const state = await loadState(host.storage, await host.installID());
    if (state.isRegistered) return;
    if (await native.register()) await saveState(host.storage, { ...state, isRegistered: true });
  };

  const fetchSchema = async (host: DetourAttributionHost) => {
    const result = await host.fetchConversionValueSchema(etag);
    if (result.kind !== "updated") return;
    const fetched = parseSchema(result.body);
    if (!fetched) {
      console.warn("🔗[Detour:ATTRIBUTION] Invalid conversion value schema; using the last one.");
      return;
    }
    await enqueue(async () => {
      schema = fetched;
      etag = result.etag;
      await saveSchema(host.storage, result.body, result.etag);
    });
  };

  const applyConversion = async (host: DetourAttributionHost, conversion: DetourConversion) => {
    await registerIfAllowed(host);
    const state = await loadState(host.storage, await host.installID());
    const count = (state.counts[conversion.name] ?? 0) + 1;
    const counted = { ...state, counts: { ...state.counts, [conversion.name]: count } };
    await saveState(host.storage, counted);

    const rule = bestRule(schema, conversion, count);
    // Only an increase is sent: the highest matching value wins.
    if (!rule || rule.fine <= counted.highestFine) return;
    // Stored only once SKAdNetwork took it, so a failed value is sent again by the next conversion.
    // A taken value registers the app too; a later registration would send 0 over it.
    if (await native.updateConversionValue(rule.fine, rule.coarse ?? null, rule.lock ?? false)) {
      await saveState(host.storage, { ...counted, highestFine: rule.fine, isRegistered: true });
    }
  };

  return {
    // The schema is asked for on every start, so a rule changed on the server reaches the app on
    // its next launch.
    start: (host: DetourAttributionHost) =>
      enqueue(async () => {
        ({ schema, etag } = await loadSchema(host.storage));
        await registerIfAllowed(host);
      }).then(() => fetchSchema(host)),
    logConversion: (host: DetourAttributionHost, conversion: DetourConversion) =>
      enqueue(() => applyConversion(host, conversion)),
  };
};
