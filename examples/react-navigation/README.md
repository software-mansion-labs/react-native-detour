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

1. Start the app on iOS/Android.
2. You land on `Home`.
3. Trigger a Detour link that resolves to `/details`.
4. The app should navigate to `Details`.
5. Go back to `Home` - the same link should NOT trigger again.

## Configuring app.json

After registering your app in the Detour Dashboard, replace the placeholders in `app.json` with values from the **API configuration** section:

- `<your-org>` — your organization slug
- `<your-app-hash>` — the path prefix assigned to your app

```json
"ios": {
  "associatedDomains": ["applinks:<your-org>.godetour.link"]
},
"android": {
  "intentFilters": [{
    "data": [{ "host": "<your-org>.godetour.link", "pathPrefix": "/<your-app-hash>" }]
  }]
}
```

These same values go into the simulator commands in the section below.

## Triggering links

**Universal / App link** — open a Detour HTTPS link while the app is running:

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

- Configure this app in Detour Dashboard (`https://godetour.dev`) using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`), then use generated values to fill `.env` and update `app.json` integration fields (intent filters, etc.).
- Install dependencies from the repo root: `pnpm install`
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
