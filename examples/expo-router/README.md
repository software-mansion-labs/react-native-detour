# Detour Expo Router Example

This is the minimal, recommended starting point for integrating `@swmansion/react-native-detour` with Expo Router.

## Scenario represented

- `DetourProvider` is initialized in `_layout.tsx` with SDK config.
- `useDetourContext` drives navigation: when a link is processed, the app navigates directly to `link.pathname`.
- `+native-intent.tsx` uses `createDetourNativeIntentHandler` as a pass-through to intercept Detour domains before Expo Router routing.
- Deferred links are resolved via clipboard (`shouldUseClipboard: true`).
- If `.env` credentials are missing, a `SetupRequired` screen is shown instead.

## Test flow

1. Start the app on iOS/Android.
2. You land on `/`.
3. Trigger a Detour universal link resolving to `/details`.
4. The app navigates directly to the `/details` screen.
5. Go back to `/` — the same link should NOT trigger again.

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
- Trigger test links: **deferred** — copy the link from Detour Dashboard before a fresh install, then install and launch (link resolves on first open). **Universal/App link** — open the link from Dashboard while the app is running. See **Test flow** for more detail.
