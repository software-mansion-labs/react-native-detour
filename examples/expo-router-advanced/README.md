# Detour Expo Router Example (Advanced)

This example simulates a gated flow where a deep link is handled only after the user signs in.
For a minimal setup, see `examples/expo-router`.

## Scenario represented

- Two entry points:
  - `/` when the user is signed out.
  - `/home` when the user is signed in.
- A Detour deep link can arrive at any time.
- If the user is not signed in, the link is stored as a pending route and Detour context is cleared.
- Once the user signs in, the app redirects to the pending deep link.

## Native intent handling

This example uses `app/+native-intent.tsx` to:

- intercept Detour domains before Expo Router routing,
- redirect custom scheme links to a dedicated `/third-party` route based on user-specific logic not related with Detour

## Test flow

1) Start the app on iOS/Android.
2) You land on `/` (signed out).
3) Trigger a Detour universal link to `/details` (or any route) while signed out.
   - The link is captured, context is cleared, and the app stays on `/`.
   - You should see the pending route displayed on the screen.
4) Tap **Sign in**.
5) The app should now redirect to the deep link route.
6) Return to `/home` - the link should NOT trigger again.

Optional custom scheme test:

- Open `detour-expo-router-advanced://app/anything`.
- The app should open dedicated `/third-party` screen.

## Quick start

- Install dependencies: `yarn install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `cd examples/expo-router-advanced && npx expo prebuild`
- Start the example from repo root: `yarn examples:expo-router-advanced start`
- Run on device/simulator: `yarn workspace @swmansion/react-native-detour-expo-router-advanced ios` or `yarn workspace @swmansion/react-native-detour-expo-router-advanced android`
