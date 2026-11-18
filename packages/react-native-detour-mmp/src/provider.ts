import type {
  DetourAttributionHost,
  DetourAttributionProvider,
  DetourConversion,
} from "@swmansion/react-native-detour";

import {
  type ConversionValueSchema,
  EMPTY_SCHEMA,
  bestRule,
  parseSchema,
} from "./conversionValue/schema";
import { loadSchema, loadState, saveSchema, saveState } from "./conversionValue/store";
import type * as Native from "./native";

/** The calls into the native module, so tests can pass their own. */
export type NativeAttribution = Pick<
  typeof Native,
  "isAvailable" | "register" | "updateConversionValue" | "attributionToken"
>;

export const createAttributionProvider = (native: NativeAttribution): DetourAttributionProvider => {
  let host: DetourAttributionHost | null = null;
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
  const registerIfAllowed = async (current: DetourAttributionHost) => {
    if (!(await current.isAttributionAllowed())) return;
    const state = await loadState(current.storage, await current.installID());
    if (state.isRegistered) return;
    if (await native.register()) await saveState(current.storage, { ...state, isRegistered: true });
  };

  const fetchSchema = async (current: DetourAttributionHost) => {
    const result = await current.fetchConversionValueSchema(etag);
    if (result.kind !== "updated") return;
    const fetched = parseSchema(result.body);
    if (!fetched) {
      console.warn("🔗[Detour:ATTRIBUTION] Invalid conversion value schema; using the last one.");
      return;
    }
    await enqueue(async () => {
      schema = fetched;
      etag = result.etag;
      await saveSchema(current.storage, result.body, result.etag);
    });
  };

  const applyConversion = async (current: DetourAttributionHost, conversion: DetourConversion) => {
    await registerIfAllowed(current);
    const state = await loadState(current.storage, await current.installID());
    const count = (state.counts[conversion.name] ?? 0) + 1;
    const counted = { ...state, counts: { ...state.counts, [conversion.name]: count } };
    await saveState(current.storage, counted);

    const rule = bestRule(schema, conversion, count);
    // SKAdNetwork takes only increases.
    if (!rule || rule.fine <= counted.highestFine) return;
    // Stored only once SKAdNetwork took it, so a failed value is sent again by the next conversion.
    if (await native.updateConversionValue(rule.fine, rule.coarse ?? null, rule.lock ?? false)) {
      await saveState(current.storage, { ...counted, highestFine: rule.fine });
    }
  };

  return {
    // The schema is asked for on every start, so a rule changed on the server reaches the app on
    // its next launch.
    didStart: (started) => {
      if (!native.isAvailable) return;
      host = started;
      enqueue(async () => {
        ({ schema, etag } = await loadSchema(started.storage));
        await registerIfAllowed(started);
      }).then(() => fetchSchema(started));
    },
    didLogConversion: (conversion) => {
      const current = host;
      if (!current) return;
      enqueue(() => applyConversion(current, conversion));
    },
    attributionToken: native.attributionToken,
  };
};
