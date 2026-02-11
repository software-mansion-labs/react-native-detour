# Detour Expo Router Example

This example demonstrates how to use `@swmansion/react-native-detour` with Expo Router using the **native intent handler**.

## Overview

This example uses Expo Router's `+native-intent.tsx` feature to intercept Detour links before they're processed by the router, eliminating the "Not Found" flash and providing a smooth loading experience.

For more advanced use case with authentication, see `example-expo-router-advanced`.

## Test flow

1) Start the app on iOS/Android.
2) You land on `/`.
3) Trigger a Detour universal link to `/details` (or any route).
4) The app should redirect to that route.
5) Return to `/` - the link should NOT trigger again.

## Quick start

- `yarn install`
- `yarn example:router start`
- `yarn ios` / `yarn android`
