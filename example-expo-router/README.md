# Detour Expo Router Example

This example simulates a complex app flow where a deep link must be handled only after the user signs in and passes a device unlock (FaceID/TouchID/PIN).

## Scenario represented

- Two entry points:
  - `/` when the user is signed out.
  - `/home` when the user is signed in.
- A Detour deep link can arrive at any time.
- If the user is not signed in or not unlocked, the link is stored as a pending route and Detour context is cleared.
- Once the user signs in and unlocks, the app redirects to the pending deep link.

## Short links and unknown routes

Short links resolve asynchronously, so Expo Router may briefly treat them as unknown routes.  
This example includes a catch-all route (`app/[...link].tsx`) to intercept unknown paths and wait for Detour to resolve the final destination, avoiding a flash of the Not Found screen.

## Test flow

1) Start the app on iOS/Android.
2) You land on `/` (signed out).
3) Trigger a Detour universal link to `/details` (or any route) while signed out.
   - The link is captured, context is cleared, and the app stays on `/`.
   - You should see the pending route displayed on the screen.
4) Tap **Sign in**.
5) Tap **Unlock (FaceID/Pin)**.
6) The app should now redirect to the deep link route.
7) Return to `/home` - the link should NOT trigger again.

For biometric testing, make sure the device has a screen lock and at least one biometric enrolled.

## Quick start

- `yarn install`
- `yarn example:router start`
- `yarn ios` / `yarn android`
