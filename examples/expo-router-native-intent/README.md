# Detour Expo Router Native Intent Example

This example demonstrates the **new Expo Router native-intent API** from `@swmansion/react-native-detour/expo-router`.

## What this example shows

Unlike the basic `examples/expo-router` setup, this app uses `createDetourNativeIntentHandler` in **resolve mode**:

- `src/app/+native-intent.tsx`
  - calls `createDetourNativeIntentHandler(...)` with `config` (`apiKey`, `appID`),
  - resolves Detour short links inside native intent,
  - maps resolved URLs to Expo Router paths via `mapToRoute`.
- `src/app/_layout.tsx`
  - uses `linkProcessingMode: 'deferred-only'` in `DetourProvider`,
  - prevents double handling of runtime/initial links (native-intent already handles them),
  - keeps deferred deep-link handling in the hook.

Result: when a universal/app link is opened, Expo Router receives the final route directly (without temporary fallback route jump).

## Related examples

- `examples/expo-router`: minimal integration.
- `examples/expo-router-advanced`: auth-gated routing flow.

## Test flow

1. Start the app on iOS/Android.
2. You land on `/`.
3. Trigger a Detour universal link (normal or short) that should resolve to `/details`.
4. Native intent resolves/maps the link and routes directly to `/details`.
5. Return to `/` - the same link should not trigger again in the current session.

## Configuring app.json

After registering your app in the [Detour Dashboard](https://godetour.dev), replace the placeholders in `app.json` with values from the **API configuration** section:

- `<your-org>` — your organization slug
- `<your-app-hash>` — the path prefix assigned to your app

```json
"ios": {
  "bundleIdentifier": "<your-bundle-identifier",
  "associatedDomains": ["applinks:<your-org>.godetour.link"]
},
"android": {
  "package": "<your-package>",
  "intentFilters": [{
    "data": [{ "host": "<your-org>.godetour.link", "pathPrefix": "/<your-app-hash>" }]
  }]
}
```

These same values go into the simulator commands in the section below.

## Triggering links

**Universal / App link** — open a Detour HTTPS link:

```sh
# iOS simulator
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/details"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/details"
```

**Deferred link** — simulates a link clicked before the app was installed:

1. Copy a Detour link URL from the Dashboard to your clipboard.
2. Kill or uninstall the app.
3. Relaunch — the SDK reads the clipboard on startup and resolves the link automatically.

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
