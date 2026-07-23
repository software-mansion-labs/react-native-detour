# Collected fields

This document lists every field the SDK collects and sends, why it exists, and how the pieces fit
together. It's meant as a reference for anyone reviewing or extending the SDK's data collection —
not user-facing documentation (see the main [README](./README.md) for that).

## The process, in short

The SDK talks to three backend endpoints, each covering a different moment in the app's lifecycle:

1. **`/api/link/match-link`** — called once per install, from `getDeferredLink.ts`. Tries to match
   the current device to a click that happened before install (deferred deep linking). Sends a
   `DeterministicFingerprint` (exact click ID from the Android install referrer) or, if that isn't
   available, a `ProbabilisticFingerprint` (device/locale/timezone/clipboard signals used for a
   best-effort match).
2. **`/api/link/universal-link-click`** — called from `sendUniversalLinkClick.ts` whenever the app
   is opened via a Universal/App Link at runtime (not a deferred install).
3. **`/api/analytics/event`** and **`/api/analytics/retention`** — called from `events.ts` /
   `retention.ts` whenever the host calls `DetourAnalytics.logEvent` / `logRetention` /
   `logConversion`, or when the SDK's own `useAppOpenRetention`/`useSessionTracking` hooks fire.

All three share the same **identity signals** (`device_id`/`install_id`, `idfv`, `aaid`, `idfa`,
`customer_user_id`) — that's what lets the backend stitch together "the click that led to this
install" and "the events this install later produced" into one continuous record, instead of
seeing them as unrelated facts. See `shared/` for where each signal is collected, and
`analytics/utils/buildAnalyticsContext.ts` / `links/utils/fingerprint.ts#collectIdentityFields` for
where they get assembled into a request.

## Identity fields (shared across all three endpoints)

| Field | Source | Why |
|---|---|---|
| `device_id` (events/retention) / `install_id` (fingerprint) | `shared/devicePersistence.ts` — random UUID, generated once, persisted to storage | Anchors every event from one installation together before (or absent) a logged-in user. Survives app restarts, not reinstalls. |
| `idfv` | `shared/deviceIdentifiers.ts` (`Application.getIosIdForVendorAsync`) | iOS per-vendor ID. Available without ATT consent — the most reliable iOS identity signal pre-login. |
| `aaid` | `shared/deviceIdentifiers.ts` (`expo-tracking-transparency`'s `getAdvertisingId`, Android) | Android advertising ID. Feeds the backend's deterministic `device_uuid` for cross-MMP migration matching. |
| `idfa` | Same native call, iOS | Ad-attribution signal only — doesn't feed `device_uuid` (IDFV does). Empty unless ATT is granted. |
| `customer_user_id` | `shared/userIdentity.ts`, set via `DetourAnalytics.setUserId()` | The one identifier that survives reinstalls and is shared across a user's devices — the root key for merging anonymous and identified activity. |

## Event / retention payload (`analytics/types/index.ts#AnalyticsContext`)

**Wire shape:** `event_name`, `data` (events only), `timestamp`, `platform`, `device_id` stay
top-level — that's exactly what the backend's current `/api/analytics/event` and
`/api/analytics/retention` endpoints already read and store today. Everything below is new and not
yet persisted server-side (see "Not yet stored server-side" below) — it's grouped under one
`metadata` object (`buildAnalyticsContext.ts#toMetadataFields`/`toConversionFields`) instead of
more top-level keys, so the existing endpoint stays backward-compatible (it already ignores unknown
body fields) and adding backend support later means parsing one object, not hunting down
individually-added fields.

| Field (inside `metadata`) | Source | Why |
|---|---|---|
| `idfv` / `aaid` / `idfa` / `customer_user_id` | See identity fields above | Same identity signals as the fingerprint payload. |
| `app_version` / `build_number` | `shared/appInfo.ts` (`expo-application`) | Groups events by release; `build_number` distinguishes builds within the same marketing version. |
| `os_version` | `shared/deviceInfo.ts` | Basic diagnostic/segmentation context. |
| `locale` | `expo-localization`, collected in `buildAnalyticsContext.ts` | Segmentation without relying on IP-based guesses. |
| `att_status` | `shared/deviceIdentifiers.ts` | Explicit ATT state (`granted`/`denied`/`undetermined`/`unavailable`) — otherwise indistinguishable from "not asked yet" if inferred only from a missing `idfa`. |
| `consent` | `shared/consent.ts` (`{ ad, analytics, tracking, source, updatedAt }`) | Audit trail of what the user had consented to when the event was logged. Auto-derived from ATT (iOS) / AAID opt-out (Android) unless the host calls `setConsent()` directly, which always wins (see `applyAutoConsent`'s manual-source guard). |
| `session_id` | `analytics/hooks/useSessionTracking.tsx` | Groups a contiguous stretch of activity (funnels, time-in-session). Rotates after 30 min in background. |
| `revenue` / `currency` / `product_id` / `quantity` / `transaction_id` | Host-supplied via `DetourAnalytics.logConversion()` (events only) | Revenue as first-class fields (not buried in `data`) so the backend can aggregate ROAS without per-host parsing conventions. |

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

## What's collected but never used to gate anything

Nothing gates on `consent` today — it's recorded as a field on every request, not used to skip
collection. See the open discussion in the PR about whether `ad`/`tracking: false` should stop
AAID/IDFA collection specifically (deferred, pending team discussion).
