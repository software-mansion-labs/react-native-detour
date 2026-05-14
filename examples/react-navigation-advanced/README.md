# Detour React Navigation Example (Advanced)

This example demonstrates an auth-gated React Navigation app with Detour integration.

## Scenario represented

- Auth flow with conditional screen rendering in a single stack (React Navigation standard pattern).
- Screens: `SignIn` → `Onboarding` (once per install) → `Tabs` (Home, Explore, Settings) + `Details`.
- React Navigation linking uses the SDK adapter API as the URL source:
  - `Detour.getInitialURL()`
  - `Detour.addEventListener("url", ({ url }) => ...)`
- The navigator opts into `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` so React Navigation remembers a deep link that hits a screen which is not currently rendered and replays it once that screen becomes part of the navigator.
- Detour processes all link types (universal / app links, custom scheme, deferred) and the app maps routes via React Navigation linking config.

## Auth-gated deferred link behavior

- If a deferred link arrives and the user is not signed in, the splash hides and `SignIn` is shown. React Navigation parses the URL, finds `Details` is not currently rendered, and marks the action as the last unhandled one.
- After sign-in, the rendered screen set changes. If onboarding has not been completed yet, `Onboarding` is shown — `Details` is still not rendered, so the pending link stays remembered.
- After onboarding, `Details` becomes part of the rendered stack. React Navigation retries the unhandled action and navigates to `Details` (or falls through to `NotFound`).

> **Note:** `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` is not deep-link-specific. It also captures other unhandled navigation actions — for example a manual `navigation.navigate(...)` call or an `initialState` pointing at a screen that isn't currently rendered — and replays them once that screen becomes part of the navigator. See the React Navigation docs for the full behavior.

### Expected dev-only warning

When the link arrives while the target screen isn't rendered yet (e.g. on `SignIn`), React Navigation logs a development-only warning.

This is the dispatch attempt against the current (signed-out) navigator state. `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` then stashes the action and replays it once `Details` is part of the rendered stack. The message is stripped in production builds.

Reference docs:
- https://reactnavigation.org/docs/deep-linking?config=static#integrating-with-other-tools
- https://reactnavigation.org/docs/auth-flow (see `UNSTABLE_routeNamesChangeBehavior`)

## Test flow

1. Start the app on iOS/Android.
2. You land on `SignIn` (or `Tabs` if already signed in).
3. Trigger a Detour universal link resolving to `/details`.
4. The app navigates to the `Details` screen.
5. Go back — the same link should NOT trigger again.

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
