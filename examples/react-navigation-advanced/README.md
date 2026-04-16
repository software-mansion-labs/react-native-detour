# Detour React Navigation Example (Advanced)

This example demonstrates an auth-gated React Navigation app with Detour integration.

## Scenario represented

- Auth flow with conditional screen rendering in a single stack (React Navigation standard pattern).
- Screens: `SignIn` → `Onboarding` (once per install) → `Tabs` (Home, Explore, Settings) + `Details`.
- `useDetourGate` coordinates Detour link state with auth state — deferred links survive the full sign-in and onboarding flow.
- Two deep-link sources:
  - Detour resolved routes (HTTP/HTTPS universal links and deferred links).
  - Custom scheme links (`detour-react-navigation-advanced://`) handled by React Navigation Linking and routed to the `ThirdParty` screen.

## Deep link responsibility split

- Detour handles deferred and Universal (iOS) / App (Android) HTTP(S) links (`linkProcessingMode: "web-only"`).
- React Navigation Linking handles only custom scheme links (`detour-react-navigation-advanced://`), routing them to the `ThirdParty` screen.

## Auth-gated deferred link behavior

- If a deferred link arrives and the user is not signed in, the splash hides and `SignIn` is shown. The link is preserved in Detour context.
- After sign-in, `useDetourGate` re-fires. If onboarding has not been completed yet, `Onboarding` is shown first — the link is still kept alive.
- After onboarding, `useDetourGate` re-fires again, clears the link, and navigates to `Details`.

## Test flow

1. Start the app on iOS/Android.
2. You land on `SignIn` (or `Tabs` if already signed in).
3. Trigger a Detour universal link resolving to `/details`.
4. The app navigates to the `Details` screen.
5. Go back — the same link should NOT trigger again.

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
npx uri-scheme open "detour-react-navigation-advanced://details" --ios

# Android emulator
npx uri-scheme open "detour-react-navigation-advanced://details" --android
```

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in Detour Dashboard: `https://godetour.dev` using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use values from Dashboard from "API configuration" section to fill `.env` and update `app.json` with generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`
