import { BASE_URL, EXPERIMENTS_API_URL, sdkHeaders } from "../config";
import type { ExperimentEvent, ExperimentOutcomeEvent, OnLogEvent } from "../types";
import {
  type DeviceAttributes,
  type DevicePlatform,
  isDevicePlatform,
  readDeviceAttributes,
  readPlatformOS,
} from "./deviceAttributes";
import { isDevEnvironment, isDevRuntime, warnOnceInDev } from "./environment";
import {
  type EventOutbox,
  OUTBOX_STORAGE_KEY,
  type OutboundEvent,
  type OutboxTransportResult,
  createEventOutbox,
  statusIsRetryable,
} from "./eventOutbox";
import { readSession } from "./session";
import { type StorageAdapter, generateUuid, resolveDeviceId, resolveStorage } from "./storage";

export type CreateEventSinkOptions = {
  apiKey?: string | undefined;
  appId?: string | undefined;
  getContext?: (() => Record<string, unknown>) | undefined;
  appVersion?: string | undefined;
  onSuccess?: ((event: ExperimentEvent) => void) | undefined;
  onError?: ((error: Error, event: ExperimentEvent) => void) | undefined;
  storage?: StorageAdapter | undefined;
  devEvents?: boolean | undefined;
  fetchImpl?: typeof fetch | undefined;
  platform?: string | undefined;
};

const EXPOSURES_URL = `${EXPERIMENTS_API_URL}/exposures`;
// Outcomes are App Events, not a Detour Experiments event type.
const APP_EVENTS_URL = `${BASE_URL}/api/analytics/event`;
export const OUTCOME_OUTBOX_STORAGE_KEY = "detour-experiments:outcome_outbox";
export const MAX_APP_EVENT_BATCH_SIZE = 100;
const APP_EVENT_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;

type AppEventDraft = {
  event_id: string;
  event_name: string;
  timestamp: string;
  platform: DevicePlatform;
  data: Record<string, unknown>;
};

type QueuedOutcome = { appEvent: AppEventDraft; event: ExperimentOutcomeEvent };

function isDevEvent(event: ExperimentEvent): boolean {
  return event.isDev ?? isDevEnvironment();
}

function warnDevEventsOffOnce(): void {
  warnOnceInDev(
    "dev-events-off",
    "[Detour Experiments] Development events are off: mock, overrides and capture previews show no data. " +
      "Detour's own events still send.",
  );
}

function warnUnsupportedPlatformOnce(platform: string | undefined): void {
  warnOnceInDev(
    "unsupported-platform",
    `[Detour Experiments] Outcomes are not sent on platform "${platform ?? "unknown"}": they are ` +
      `Detour App Events, which accept only ios and android. Exposures are still sent.`,
  );
}

// `event_id` is minted here, not at send time, so a retried batch is deduplicated.
function toAppEvent(event: ExperimentOutcomeEvent, platform: DevicePlatform): AppEventDraft {
  const occurredAt = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
  return {
    event_id: generateUuid(),
    event_name: event.metric,
    timestamp: new Date(occurredAt).toISOString(),
    platform,
    data: {
      experimentKey: event.experimentKey,
      variant: event.variant,
      ...(event.value !== undefined ? { value: event.value } : {}),
      ...(event.step !== undefined ? { step: event.step } : {}),
      ...(isDevEvent(event) ? { isDev: true } : {}),
    },
  };
}

type Rejection = { index: number; error: string };

// "override" is what builds up to 0.6.x queued; only an override goes without a config version.
function isSendableExposure(stored: unknown): boolean {
  if (typeof stored !== "object" || stored === null) return false;
  const { id, experimentKey, variant, configVersion, source } = stored as Record<string, unknown>;
  if (
    "flagKey" in stored ||
    typeof id !== "string" ||
    typeof experimentKey !== "string" ||
    typeof variant !== "string"
  ) {
    return false;
  }
  return typeof configVersion === "number" || source === "devOverride" || source === "override";
}

// A 200 whose body is missing or malformed still means the batch arrived.
async function readRejections(response: Response): Promise<Rejection[]> {
  try {
    const body = (await response.json()) as { rejected?: unknown } | null;
    if (!Array.isArray(body?.rejected)) return [];
    return body.rejected.filter(
      (item): item is Rejection =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Rejection).index === "number" &&
        typeof (item as Rejection).error === "string",
    );
  } catch {
    return [];
  }
}

async function postBatch(
  fetchImpl: typeof fetch | undefined,
  url: string,
  headers: Record<string, string>,
  events: unknown[],
): Promise<OutboxTransportResult> {
  if (typeof fetchImpl !== "function") {
    return { ok: false, retryable: true, error: new Error("fetch is unavailable in this runtime") };
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ events }),
    });

    if (response.ok) return { ok: true, rejected: await readRejections(response) };

    return {
      ok: false,
      retryable: statusIsRetryable(response.status),
      error: new Error(`Failed with status ${response.status}`),
    };
  } catch (error) {
    return { ok: false, retryable: true, error: error as Error };
  }
}

type EventSink = OnLogEvent & {
  flush: () => Promise<void>;
  pendingCount: () => number;
  droppedCount: () => number;
};

export function createEventSink(options: CreateEventSinkOptions = {}): EventSink {
  const { apiKey, appId } = options;
  const sendsDevEvents = options.devEvents !== false;
  if (!sendsDevEvents) warnDevEventsOffOnce();
  const storage = resolveStorage(options.storage);
  const headers = sdkHeaders(apiKey, appId);
  const fetchImpl = () => options.fetchImpl ?? globalThis.fetch;

  const exposures: EventOutbox<OutboundEvent> = createEventOutbox({
    storageKey: OUTBOX_STORAGE_KEY,
    transport: async (events: OutboundEvent[]) => {
      const deviceId = await resolveDeviceId(storage);
      return postBatch(
        fetchImpl(),
        EXPOSURES_URL,
        headers,
        events.map((event) => ({ ...event, deviceId })),
      );
    },
    keep: isSendableExposure,
    ...(storage ? { storage } : {}),
    ...(options.onSuccess ? { onSuccess: options.onSuccess } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
  });

  const outcomes: EventOutbox<QueuedOutcome> = createEventOutbox({
    storageKey: OUTCOME_OUTBOX_STORAGE_KEY,
    batchSize: MAX_APP_EVENT_BATCH_SIZE,
    transport: async (items: QueuedOutcome[]) => {
      const deviceId = await resolveDeviceId(storage);
      return postBatch(
        fetchImpl(),
        APP_EVENTS_URL,
        headers,
        items.map((item) => ({ ...item.appEvent, device_id: deviceId })),
      );
    },
    ...(storage ? { storage } : {}),
    onSuccess: (item) => options.onSuccess?.(item.event),
    onError: (error, item) => options.onError?.(error, item.event),
  });

  let platform: string | undefined | null = null;
  const resolvePlatform = (): string | undefined => {
    if (platform === null) platform = options.platform ?? readPlatformOS();
    return platform;
  };

  let ownAttributes: DeviceAttributes | null = null;
  // Inside a launch, exposures carry the attributes its audiences were matched against.
  const deviceAttributes = (): DeviceAttributes => {
    const session = readSession();
    if (session) return session.attributes;
    ownAttributes ??= readDeviceAttributes({
      appVersion: options.appVersion,
      ...(options.platform !== undefined ? { nativePlatform: { OS: options.platform } } : {}),
    });
    return ownAttributes;
  };

  function enqueueOutcome(event: ExperimentOutcomeEvent): void {
    if (!APP_EVENT_NAME_PATTERN.test(event.metric)) {
      if (isDevRuntime()) {
        console.error(
          `[Detour Experiments] Outcome "${event.metric}" dropped: outcomes are App Events; ` +
            `metric names must match ^[a-z0-9_]{1,64}$.`,
        );
      }
      return;
    }
    const os = resolvePlatform();
    if (!isDevicePlatform(os)) {
      warnUnsupportedPlatformOnce(os);
      return;
    }
    outcomes.enqueue({ appEvent: toAppEvent(event, os), event });
  }

  const sink = ((event: ExperimentEvent) => {
    const isDev = isDevEvent(event);
    if (isDev && !sendsDevEvents) return;
    if (event.type === "outcome") {
      enqueueOutcome(event);
      return;
    }

    const baseEvent: ExperimentEvent = {
      ...event,
      ...(isDev ? { isDev: true } : {}),
    };

    exposures.enqueue({
      ...deviceAttributes(),
      ...(options.getContext ? options.getContext() : {}),
      ...baseEvent,
      id: generateUuid(),
    });
  }) as EventSink;

  sink.flush = async () => {
    await Promise.all([exposures.flush(), outcomes.flush()]);
  };
  sink.pendingCount = () => exposures.pendingCount() + outcomes.pendingCount();
  sink.droppedCount = () => exposures.droppedCount() + outcomes.droppedCount();

  return sink;
}
