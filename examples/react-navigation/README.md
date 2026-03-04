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
- Run prebuild for this example: `yarn prebuild`
- Start the example: `yarn start`
- Run on device/simulator: `yarn ios` or `yarn android`
- Trigger test links: **deferred** — copy the link from Detour Dashboard before a fresh install, then install and launch (link resolves on first open). **Universal/App link** — open the link from Dashboard while the app is running. See **Test flow** for more detail.
