# Detour React Navigation Example (Advanced)

This example demonstrates an auth-gated React Navigation app with Detour integration.

## Scenario represented

- Signed-out entry screen: `Login`.
- Signed-in app screens: `Home` and protected `Details`.
- Auth flow is implemented with conditional screen rendering in a single stack (React Navigation standard pattern).
- Pending + resume flow for protected incoming links.
- Two deep-link sources:
  - React Navigation linking (`detour-react-navigation-advanced://`)
  - Detour resolved routes from `useDetourContext`.

## Deep link responsibility split

- Detour handles deferred and Universal (iOS) / App (Android) HTTP(S) links.
- React Navigation linking in this example handles only custom scheme links (`detour-react-navigation-advanced://`).
- Scheme links are intercepted in linking (`getInitialURL`/`subscribe`) when signed out to store pending target instead of dispatching an unhandled navigation action.

## Pending + resume behavior

- If a protected target (`/details/:id?`) arrives while signed out, app stores it as pending.
- User stays on `Login`.
- After sign in, app resumes pending target and clears pending state.

## Test flow

1) Start the app and stay signed out on `Login`.
2) Trigger one of these:
   - `detour-react-navigation-advanced://details/42`
   - a Detour HTTP(S) link resolving to `/details/42`
3) While signed out, app keeps a pending route and stays on `Login`.
4) Tap **Sign In**.
5) App navigates to `Details` and shows source/id metadata.

## Quick start

- Configure this app in Detour Dashboard (`https://godetour.dev`) using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`), then use generated values to fill `.env` and update `app.json` integration fields (intent filters, etc.).
- Install dependencies from repo root: `yarn install`
- Run prebuild for this example: `cd examples/react-navigation-advanced && npx expo prebuild`
- Start the example from repo root: `yarn examples:react-navigation-advanced start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-react-navigation-advanced ios` or `yarn workspace @swmansion/react-native-detour-react-navigation-advanced android`
