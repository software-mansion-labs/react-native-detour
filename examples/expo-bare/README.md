# Detour Expo Bare Example

This example demonstrates a simple integration of `@swmansion/react-native-detour` in a React Native app.

## Scenario represented

- `DetourProvider` is initialized with SDK config.
- A single screen consumes `useDetourContext()`.
- No router/navigation integration is implemented here.
- The example is focused on exposing Detour link state.

## What this example is for

- Quick SDK smoke test in isolation.
- Verifying provider setup and context values.
- Base starting point before adding your own navigation/deep-link routing logic.

If you need more complex routing flows with a specific navigation library, check out the following examples:

- `examples/expo-router`
- `examples/expo-router-advanced`
- `examples/react-navigation`

## Test flow

1) Start the app on iOS/Android.
2) Confirm the app renders and `isLinkProcessed` is `false`.
3) Trigger a Detour link.
4) Confirm `isLinkProcessed` flips to `true` and `type`, `url`, and `route` fields are populated on screen.

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
- Trigger test links: **deferred** — copy the link from Detour Dashboard before a fresh install, then install and launch (link resolves on first open). **Universal/App link** — open the link from Dashboard while the app is running. See **Test flow** for more detail.
