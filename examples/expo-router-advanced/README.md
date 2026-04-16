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

This example uses `src/app/+native-intent.tsx` to:

- intercept Detour domains before Expo Router routing,
- redirect custom scheme links to a dedicated `/third-party` route based on user-specific logic not related with Detour

## Test flow

1. Start the app on iOS/Android.
2. You land on `/` (signed out).
3. Trigger a Detour universal link to `/details` (or any route) while signed out.
   - The link is captured, context is cleared, and the app stays on `/`.
   - You should see the pending route displayed on the screen.
4. Tap **Sign in**.
5. The app should now redirect to the deep link route.
6. Return to `/home` - the link should NOT trigger again.

Optional custom scheme test:

- Open `detour-expo-router-advanced://app/anything`.
- The app should open dedicated `/third-party` screen.

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

**Custom scheme**:

```sh
# iOS simulator
npx uri-scheme open "detour-expo-router-advanced://app/anything" --ios

# Android emulator
npx uri-scheme open "detour-expo-router-advanced://app/anything" --android
```

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
