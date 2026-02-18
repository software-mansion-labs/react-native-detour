# Detour Expo Router Native Intent Example

This example demonstrates the **new Expo Router native-intent API** from `@swmansion/react-native-detour`.

## What this example shows

Unlike the basic `examples/expo-router` setup, this app uses `createDetourNativeIntentHandler` in **resolve mode**:

- `app/+native-intent.tsx`
  - calls `createDetourNativeIntentHandler(...)` with `config` (`API_KEY`, `appID`, `timeoutMs`),
  - resolves Detour short links inside native intent,
  - maps resolved URLs to Expo Router paths via `mapToRoute`.
- `app/_layout.tsx`
  - uses `linkProcessingMode: 'deferred-only'` in `DetourProvider`,
  - prevents double handling of runtime/initial links (native-intent already handles them),
  - keeps deferred deep-link handling in the hook.

Result: when a universal/app link is opened, Expo Router receives the final route directly (without temporary fallback route jump).

## Related examples

- `examples/expo-router`: minimal integration.
- `examples/expo-router-advanced`: auth-gated routing flow.

## Test flow

1) Start the app on iOS/Android.
2) You land on `/`.
3) Trigger a Detour universal link (normal or short) that should resolve to `/details`.
4) Native intent resolves/maps the link and routes directly to `/details`.
5) Return to `/` - the same link should not trigger again in the current session.

## Quick start

- Install dependencies: `yarn install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `cd examples/expo-router-native-intent && npx expo prebuild`
- Start the example from repo root: `yarn examples:expo-router-native-intent start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-expo-router-native-intent ios` or `yarn workspace @swmansion/react-native-detour-expo-router-native-intent android`
