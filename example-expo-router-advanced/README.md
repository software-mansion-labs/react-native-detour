# Detour Expo Router Example (Gated Flow)

This example simulates a gated flow where a deep link is handled only after the user signs in.
For a minimal setup, see `example-expo-router`.
It also shows how to integrate Detour SDK with custom `+native-intent.tsx` logic.

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
- redirect custom scheme links to a dedicated `/third-party` route,
- avoid relying on a catch-all route pattern for short-link handling.

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

- Open `example-expo-router-advanced://app/anything`.
- The app should open dedicated `/third-party` screen.

## Quick start

- `yarn install`
- Copy `.env.example` to `.env` and fill Detour credentials
- `yarn example:router-advanced start`
- `yarn ios` / `yarn android`
