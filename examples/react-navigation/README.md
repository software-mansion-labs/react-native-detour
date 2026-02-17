# Detour React Navigation Example

This example demonstrates how to use `@swmansion/react-native-detour` with React Navigation in an auth-gated app.

## Scenario represented

- Two app states:
  - `Login` when the user is signed out.
  - `Home`/`Details` when the user is signed in.
- A Detour link can arrive before login.
- After login, `Home` reads `linkRoute` from Detour context and navigates to `Details` when the route matches `/details`.
- After handling the link, `clearLink()` is called to avoid repeated redirects.

## Deep link handling model

Deep link handling is done directly in app logic via:

- `DetourProvider` + `useDetourContext`
- React Navigation `navigation.navigate(...)`
- auth gate in the root navigator (`Login` vs app screens)

## Test flow

1) Start the app on iOS/Android.
2) You land on `Login`.
3) Trigger a Detour link that resolves to `/details`.
4) Tap **Sign In**.
5) The app should navigate to `Details`.
6) Go back to `Home` - the same link should NOT trigger again.

## Quick start

- Install dependencies: `yarn install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `cd examples/react-navigation && npx expo prebuild`
- Start the example from repo root: `yarn examples:react-navigation start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-react-navigation ios` or `yarn workspace @swmansion/react-native-detour-react-navigation android`
