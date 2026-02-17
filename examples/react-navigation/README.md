# Detour React Navigation Example

This example demonstrates the minimal integration of `@swmansion/react-native-detour` with React Navigation.

## Scenario represented

- Navigation stack: `Home` and `Details`.
- `Home` reads `linkRoute` from Detour context.
- When route resolves to `/details`, app navigates to `Details` and calls `clearLink()`.

## Deep link handling model

- Detour handles deferred/verified links and exposes resolved route via `useDetourContext`.
- App maps `linkRoute` to React Navigation route (`/details` -> `Details`).

## Test flow

1) Start the app on iOS/Android.
2) You land on `Home`.
3) Trigger a Detour link that resolves to `/details`.
4) The app should navigate to `Details`.
5) Go back to `Home` - the same link should NOT trigger again.

## Quick start

- Configure this app in Detour Dashboard (`https://godetour.dev`) using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`), then use generated values to fill `.env` and update `app.json` integration fields (intent filters, etc.).
- Install dependencies from repo root: `yarn install`
- Run prebuild for this example: `cd examples/react-navigation && npx expo prebuild`
- Start the example from repo root: `yarn examples:react-navigation start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-react-navigation ios` or `yarn workspace @swmansion/react-native-detour-react-navigation android`
