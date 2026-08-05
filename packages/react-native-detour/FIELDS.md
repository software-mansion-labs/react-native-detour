# Collected fields

This document lists every field the SDK collects and sends, why it exists, and how the pieces fit
together. It's meant as a reference for anyone reviewing or extending the SDK's data collection —
not user-facing documentation (see the main [README](./README.md) for that).

## The process, in short

The SDK talks to four backend endpoints, each covering a different moment in the app's lifecycle:

1. **`/api/link/match-link`** — called once per install, from `getDeferredLink.ts`. Tries to match
   the current device to a click that happened before install (deferred deep linking). Sends a
   `DeterministicFingerprint` (exact click ID from the Android install referrer) or, if that isn't
   available, a `ProbabilisticFingerprint` (device/locale/timezone/clipboard signals used for a
   best-effort match).
2. **`/api/link/universal-link-click`** — called from `sendUniversalLinkClick.ts` whenever the app
   is opened via a Universal/App Link at runtime (not a deferred install).
3. **`/api/analytics/event`** and **`/api/analytics/retention`** — called from `events.ts` /
   `retention.ts` whenever the host calls `DetourAnalytics.logEvent` / `logRetention`, or when the
   SDK's own `useAppOpenRetention`/`useSessionTracking` hooks fire.
4. **`/api/analytics/conversion`** — called from `conversion.ts` whenever the host calls
   `DetourAnalytics.logConversion()`. Own endpoint rather than riding `/api/analytics/event`, since
   revenue reporting is a distinct signal from generic event logging (see
   `analyticsEmitter.ts#AnalyticsEmitterPayload`'s `"conversion"` kind) — not an event with revenue
   bolted on.

The match-link, event, retention, and conversion endpoints all share the same **identity signals**
(`device_id`/`install_id`, `idfv`, `aaid`, `idfa`, `customer_user_id`) — that's what lets the
backend stitch together "the click that led to this install" and "the events/conversions this
install later produced" into one continuous record, instead of seeing them as unrelated facts. See
`shared/` for where each signal is collected, and `analytics/utils/buildAnalyticsContext.ts` /
`links/utils/fingerprint.ts#collectIdentityFields` for where they get assembled into a request.

## Identity fields (shared across match-link, event, retention, and conversion)

| Field                                                       | Source                                                                                     | Why                                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `device_id` (events/retention) / `install_id` (fingerprint) | `shared/devicePersistence.ts` — random UUID, generated once, persisted to storage          | Anchors every event from one installation together before (or absent) a logged-in user. Survives app restarts, not reinstalls.                  |
| `idfv`                                                      | `shared/deviceIdentifiers.ts` (`Application.getIosIdForVendorAsync`)                       | iOS per-vendor ID. Available without ATT consent — the most reliable iOS identity signal pre-login.                                             |
| `aaid`                                                      | `shared/deviceIdentifiers.ts` (`expo-tracking-transparency`'s `getAdvertisingId`, Android) | Android advertising ID. Feeds the backend's deterministic `device_uuid` for cross-MMP migration matching.                                       |
| `idfa`                                                      | Same native call, iOS                                                                      | Ad-attribution signal only — doesn't feed `device_uuid` (IDFV does). Empty unless ATT is granted.                                               |
| `customer_user_id`                                          | `shared/userIdentity.ts`, set via `DetourAnalytics.setUserId()`                            | The one identifier that survives reinstalls and is shared across a user's devices — the root key for merging anonymous and identified activity. |

## Event / retention payload (`analytics/types/index.ts#AnalyticsContext`)

**Wire shape:** `event_name`, `data` (events only), `timestamp`, `platform`, `device_id` stay
top-level — that's exactly what the backend's current `/api/analytics/event` and
`/api/analytics/retention` endpoints already read and store today. Everything below is new and not
yet persisted server-side (see "Not yet stored server-side" below) — it's grouped under one
`metadata` object (`buildAnalyticsContext.ts#toMetadataFields`) instead of more top-level keys, so
the existing endpoint stays backward-compatible (it already ignores unknown body fields) and adding
backend support later means parsing one object, not hunting down individually-added fields.

| Field (inside `metadata`)                     | Source                                                                 | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idfv` / `aaid` / `idfa` / `customer_user_id` | See identity fields above                                              | Same identity signals as the fingerprint payload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `app_version` / `build_number`                | `shared/appInfo.ts` (`expo-application`)                               | Groups events by release; `build_number` distinguishes builds within the same marketing version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `os_version`                                  | `shared/deviceInfo.ts`                                                 | Basic diagnostic/segmentation context.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `locale`                                      | `expo-localization`, collected in `buildAnalyticsContext.ts`           | Segmentation without relying on IP-based guesses.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `att_status`                                  | `shared/deviceIdentifiers.ts`                                          | Explicit ATT state (`granted`/`denied`/`undetermined`/`unavailable`) — otherwise indistinguishable from "not asked yet" if inferred only from a missing `idfa`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `consent`                                     | `shared/consent.ts` (`{ ad, analytics, tracking, source, updatedAt }`) | Audit trail of what the user had consented to when the event was logged. Resolved per field from two layers that never overwrite each other: the device (ATT on iOS, ad-id opt-out on Android) and the host (`setConsent()`). Where both have an opinion the **restrictive one wins**, so the record can't claim more than the user gave in either direction; where only one does, it stands; where neither does, the field stays absent — "nobody asked" has to stay distinguishable from "the user said no". `source` is `att` / `aaid-optout` / `manual`, or `mixed` when both layers contributed. Both layers are persisted under `Detour_consent` and rehydrated before the device is read, so the result never depends on write order. `updatedAt` only moves when the flags actually change. A present Android ad id is deliberately _not_ read as a grant — Android's model is opt-out, and inaction isn't consent. |
| `session_id`                                  | `analytics/hooks/useSessionTracking.tsx`                               | Groups a contiguous stretch of activity (funnels, time-in-session). Rotates after 30 min in background.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Conversion payload (`analytics/api/conversion.ts`)

**Wire shape:** `event_name`, `revenue`, `currency`, `product_id`, `quantity`, `transaction_id`,
`timestamp`, `platform`, `device_id` top-level, plus the same identity `metadata` object as
events/retention. `event_name` is a required argument to `logConversion()` (no default) — the
reviewer flagged that defaulting silently to `DetourEventNames.Purchase` on a caller typo would
misattribute revenue to the wrong event.

| Field                                                                 | Source                                              | Why                                                                                                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revenue` / `currency` / `product_id` / `quantity` / `transaction_id` | Host-supplied via `DetourAnalytics.logConversion()` | Revenue as first-class top-level fields (not buried in `data` or nested under `metadata`) so the backend can aggregate ROAS without per-host parsing conventions. |

## Fingerprint payload (`links/utils/fingerprint.ts`)

Deterministic (Android install referrer present): identity fields + `clickId` + `utm`.

Probabilistic (fallback): identity fields + `platform`, `model`, `manufacturer`, `systemVersion`,
`screenWidth`/`screenHeight`/`scale`, `locale`, `timezone`, `userAgent`, `timestamp`, `pastedLink`
(iOS clipboard, only when `shouldUseClipboard` is on), `utm`.

`utm` comes from parsing the Android install referrer (`links/utils/urlHelpers.ts#parseUtmParams`)
— campaign attribution for installs that arrive with UTM-tagged links.

## Universal Link click payload (`links/api/sendUniversalLinkClick.ts`)

`url`, `timestamp`, `platform`, `params` (query params extracted from the clicked URL), and
`metadata: { os_version, app_version, device_model }` — enough context to rate-limit and debug
click volume without duplicating the full identity/analytics payload for a runtime link open.

## What `consent` gates

Only an explicit `false` blocks. An absent flag means nobody has asked — the norm for any host
shipping no consent UI — and treating that as a refusal would silently switch the SDK off for them.

| Flag        | Effect when `false`                                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ad`        | `idfa` and `aaid` are dropped from every payload, including the deferred-matching fingerprint. The OS already withholds its own ad id when it is the one refusing; this covers a refusal collected in the host's UI that the OS knows nothing about. |
| `analytics` | `dispatchAnalyticsEvent` returns before sending — no event, retention or conversion request leaves the device.                                                                                                                                       |
| `tracking`  | Nothing yet. On iOS it always moves together with `ad`, so it has no independent effect; it is recorded for the audit trail.                                                                                                                         |

Not gated by consent: `device_id`, `install_id`, `idfv`, `customer_user_id`, the probabilistic
fingerprint, the clipboard read (`shouldUseClipboard` is its own switch), and the IP address the
backend reads from request headers.
