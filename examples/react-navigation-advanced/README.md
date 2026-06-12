# Detour React Navigation Example (Advanced)

An auth-gated [React Navigation](https://reactnavigation.org/) app with [`@swmansion/react-native-detour`](https://detour.swmansion.com/docs/sdk/react-native/sdk-installation). A deep link can arrive at any point in the `SignIn → Onboarding → Tabs` flow; React Navigation remembers it and replays it once the target screen becomes reachable. For a minimal setup, start with [`examples/react-navigation`](../react-navigation).

> 📸 **Screenshot — Auth + onboarding gated flow**
> _Four frames: a deep link arrives on `SignIn` → user signs in → `Onboarding` is shown (link still pending) → after onboarding the app lands on `Details`._
>
> <!-- TODO: add ./assets/screenshots/app-rn-advanced-gated-flow.png -->

## How it works

- Screen flow: `SignIn` → `Onboarding` (once per install) → `Tabs` (Home, Explore, Settings) + `Details`.
- Detour feeds URLs via `Detour.getInitialURL()` and `Detour.addEventListener("url", ...)`.
- `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` makes React Navigation remember an unresolvable deep link and replay it once the target screen becomes renderable.
- All link types handled: Universal/App links, custom scheme, and deferred.

→ [deferred deep linking blog series](https://swmansion.com/blog/integrating-deferred-deep-linking-in-react-native-apps-1/) · [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage)

## Auth-gated deferred link behavior

<details>
<summary>How a link survives sign-in and onboarding</summary>

- If a deferred link arrives and the user is not signed in, the splash hides and `SignIn` is shown. React Navigation parses the URL, finds `Details` is not currently rendered, and marks the action as the last unhandled one.
- After sign-in, the rendered screen set changes. If onboarding has not been completed yet, `Onboarding` is shown — `Details` is still not rendered, so the pending link stays remembered.
- After onboarding, `Details` becomes part of the rendered stack. React Navigation retries the unhandled action and navigates to `Details` (or falls through to `NotFound`).

> **Note:** `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` is not deep-link-specific. It also captures other unhandled navigation actions — for example a manual `navigation.navigate(...)` call or an `initialState` pointing at a screen that isn't currently rendered — and replays them once that screen becomes part of the navigator. See the React Navigation docs for the full behavior.

</details>

<details>
<summary>Expected dev-only warning</summary>

When the link arrives while the target screen isn't rendered yet (e.g. on `SignIn`), React Navigation logs a development-only warning.

This is the dispatch attempt against the current (signed-out) navigator state. `UNSTABLE_routeNamesChangeBehavior="lastUnhandled"` then stashes the action and replays it once `Details` is part of the rendered stack. The message is stripped in production builds.

</details>

Reference docs:

→ [React Navigation deep linking](https://reactnavigation.org/docs/deep-linking?config=static#integrating-with-other-tools)
→ [React Navigation auth flow](https://reactnavigation.org/docs/auth-flow) (see `UNSTABLE_routeNamesChangeBehavior`)

## Test flow

1. Start the app on iOS/Android.
2. You land on `SignIn` (or `Tabs` if already signed in).
3. Trigger a Detour Universal/App link resolving to `/details` (see [Triggering links](#triggering-links)).
4. The app navigates to the `Details` screen.
5. Go back — the same link should **not** trigger again.

> 📸 **Screenshot — Result screen**
> _The `Details` screen reached after the pending link replays once onboarding completes._
>
> <!-- TODO: add ./assets/screenshots/app-rn-advanced-result.png -->

## Set up Detour

You need a Detour account to register this app and generate its credentials. [Sign up](https://godetour.dev/auth/signup) and open the [Detour Dashboard](https://godetour.dev). If you run into issues during setup, the [Dashboard Walkthrough](https://detour.swmansion.com/docs/Fundamentals/dashboard) covers each step in detail.

### 1. Register the app

Create an organization and add a new app. Detour assigns it a base link URL of the form `https://<your-org>.godetour.link/<your-app-hash>`.

> 📸 **Screenshot — Dashboard › Apps**
> _The "New app" dialog: organization picker, app name, and the generated base link URL (`<your-org>.godetour.link/<your-app-hash>`)._
>
> <!-- TODO: add ./assets/screenshots/dashboard-create-app.png -->

→ [Dashboard › Apps](https://detour.swmansion.com/docs/Fundamentals/dashboard#apps)

### 2. Configure the platforms

Open **App configuration** and fill the iOS card (Bundle ID, Team ID, App Store ID) and the Android card (package name, SHA-256 certificates). The dashboard generates the `associatedDomains` and intent-filter snippets you paste into `app.json` ([below](#configuring-appjson)).

> For local development (`npx expo run:android`), use the **local debug keystore** fingerprint — not a Play App Signing or EAS key. See [Testing Android App Links](https://detour.swmansion.com/docs/sdk/react-native/testing#testing-android-app-links) for more information.

> 📸 **Screenshot — Dashboard › App configuration**
> _iOS and Android cards with Bundle ID / package and signing fields, plus the generated `associatedDomains` / intent-filter snippets ready to copy._
>
> <!-- TODO: add ./assets/screenshots/dashboard-app-configuration.png -->

→ [Dashboard › App configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#app-configuration)

### 3. Copy your credentials

Open **API configuration** and copy your `appID` and publishable `apiKey` into this example's `.env`.

> 📸 **Screenshot — Dashboard › API configuration**
> _The API configuration panel showing `appID` and the publishable `apiKey` with copy buttons._
>
> <!-- TODO: add ./assets/screenshots/dashboard-api-configuration.png -->

→ [Dashboard › API configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#api-configuration-and-key-security)

### 4. (Optional) Tune deferred-link matching

Because this example exercises the deferred case through a multi-step gate, you may want to review the **Matching** settings (threshold and time window) that control how a pre-install click is paired with the first launch.

> 📸 **Screenshot — Dashboard › Matching**
> _The matching panel with the confidence threshold and time-window controls, alongside short-link match statistics._
>
> <!-- TODO: add ./assets/screenshots/dashboard-matching.png -->

→ [Matching](https://detour.swmansion.com/docs/Architecture/matching)

## Configuring app.json

Replace the placeholders in `app.json` with the values from the dashboard's [App configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#app-configuration) section:

- `<your-org>` — your organization slug
- `<your-app-hash>` — the path prefix assigned to your app

<details>
<summary>app.json deep link config</summary>

```json
"ios": {
  "bundleIdentifier": "<your-bundle-identifier>",
  "associatedDomains": ["applinks:<your-org>.godetour.link"]
},
"android": {
  "package": "<your-package>",
  "intentFilters": [{
    "data": [{ "host": "<your-org>.godetour.link", "pathPrefix": "/<your-app-hash>" }]
  }]
}
```

</details>

These same values go into the simulator commands in the next section.

## Triggering links

<details>
<summary>Deferred deep link</summary>

Follow these steps to test the deferred flow:

1. Uninstall the app or clear its data to start from a clean state.
2. Open a Detour link in the device's mobile browser.
3. Install and launch the app — the SDK resolves the link automatically.

> **Note:** On Android, the install referrer is typically unavailable in development builds, so deferred matching falls back to probabilistic signals (IP, device fingerprint) only. See [Limitations & Known Issues](https://detour.swmansion.com/docs/Architecture/architecture-limitations).

Alternatively on iOS, you can also copy the link to your clipboard before uninstalling — the SDK reads the clipboard on first launch (`shouldUseClipboard: true`), so you can skip the browser step. It simulates a link clicked before the app was installed.

</details>

<details>
<summary>Universal / App link</summary>

Open a Detour link directly from the terminal:

```sh
# iOS simulator
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/details"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/details"
```

Alternatively, paste the link into Notes or Messages on the device and tap it — this uses the same OS routing path a real user would.

</details>

<details>
<summary>Custom scheme</summary>

```sh
# iOS simulator
npx uri-scheme open "detour-react-navigation-advanced://details" --ios

# Android emulator
npx uri-scheme open "detour-react-navigation-advanced://details" --android
```

</details>

For more cases and gotchas, see [Testing & Troubleshooting](https://detour.swmansion.com/docs/sdk/react-native/testing).

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in the [Detour Dashboard](https://godetour.dev) using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use the values from the dashboard's [API configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#api-configuration-and-key-security) section to fill `.env` and update `app.json` with the generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`

## See also

- [`examples/react-navigation`](../react-navigation) — minimal integration
- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) — how to integrate Detour with your navigation library
- [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) — full type and method reference
