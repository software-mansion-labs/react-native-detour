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

## Configuring app.json

After registering your app in the [Detour Dashboard](https://godetour.dev), replace the placeholders in `app.json` with values from the **API configuration** section:

- `<your-org>` — your organization slug
- `<your-app-hash>` — the path prefix assigned to your app

```json
"ios": {
  "bundleIdentifier": "<your-bundle-identifier",
  "associatedDomains": ["applinks:<your-org>.godetour.link"]
},
"android": {
  "package": "<your-package>",
  "intentFilters": [{
    "data": [{ "host": "<your-org>.godetour.link", "pathPrefix": "/<your-app-hash>" }]
  }]
}
```

These same values go into the simulator commands in the section below.

## Triggering links

**Universal / App link** — open a Detour HTTPS link:

```sh
# iOS simulator
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/details"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/details"
```

**Deferred link** — simulates a link clicked before the app was installed:

1. Copy a Detour link URL from the Dashboard to your clipboard.
2. Kill or uninstall the app.
3. Relaunch — the SDK reads the clipboard on startup and resolves the link automatically.

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
