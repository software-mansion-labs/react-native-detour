# Detour Expo Router Example

This example demonstrates how to use `@swmansion/react-native-detour` with Expo Router.

## Overview

This example uses Expo Router's `+native-intent.tsx` feature to intercept Detour links before they're processed by the router, eliminating the "Not Found" flash and providing a smooth loading experience.

For more advanced use case with authentication, see `examples/expo-router-advanced`.

## Test flow

1) Start the app on iOS/Android.
2) You land on `/`.
3) Trigger a Detour universal link to `/details` (or any route).
4) The app should redirect to that route.
5) Return to `/` - the link should NOT trigger again.

## Quick start

- Install dependencies: `yarn install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `cd examples/expo-router && npx expo prebuild`
- Start the example from repo root: `yarn examples:expo-router start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-expo-router ios` or `yarn workspace @swmansion/react-native-detour-expo-router android`
