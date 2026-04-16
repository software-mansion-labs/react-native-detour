# Detour Expo Bare Example

This example demonstrates a simple integration of `@swmansion/react-native-detour` in a React Native app.

## Scenario represented

- `DetourProvider` is initialized with SDK config.
- A single screen consumes `useDetourContext()`.
- No router/navigation integration is implemented here.
- The example is focused on exposing Detour link state.

## What this example is for

- Quick SDK smoke test in isolation.
- Verifying provider setup and context values.
- Base starting point before adding your own navigation/deep-link routing logic.

If you need more complex routing flows with a specific navigation library, check out the following examples:

- `examples/expo-router`
- `examples/expo-router-advanced`
- `examples/react-navigation`

## Test flow

1. Start the app on iOS/Android.
2. Confirm the app renders and `isLinkProcessed` is `false`.
3. Trigger a Detour link.
4. Confirm `isLinkProcessed` flips to `true` and `type`, `url`, and `route` fields are populated on screen.

## Configuring app.json

After registering your app in the Detour Dashboard, replace the placeholders in `app.json` with values from the **API configuration** section:

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
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/"
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
