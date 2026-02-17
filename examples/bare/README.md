# Detour Bare Example

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
2) Confirm the app renders with `DetourProvider` enabled.
3) Trigger a Detour link and inspect Metro/device logs for context updates.
4) Confirm `isLinkProcessed` transitions and link fields are populated when a link is detected.

## Quick start

- Install dependencies: `yarn install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `cd examples/bare && npx expo prebuild`
- Start the example from repo root: `yarn examples:bare start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-bare ios` or `yarn workspace @swmansion/react-native-detour-bare android`
