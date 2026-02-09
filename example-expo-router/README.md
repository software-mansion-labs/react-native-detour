# Detour Expo Router Example

This example shows the Expo Router setup with Detour:

- wrap the app in `DetourProvider`,
- redirect to `linkRoute` once it is available,
- call `clearLink()` to avoid repeating the redirect.

For more advanced use case, see `example-expo-router-advanced`.

## Short links and unknown routes

Short links resolve asynchronously, so Expo Router may briefly treat them as unknown routes.  
This example includes a catch-all route (`app/[...link].tsx`) to intercept unknown paths and wait for Detour to resolve the final destination, avoiding a flash of the Not Found screen.

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
