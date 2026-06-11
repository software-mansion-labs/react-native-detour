# Detour Expo Bare Example

The simplest possible integration of [`@swmansion/react-native-detour`](https://detour.swmansion.com/docs/sdk/react-native/sdk-installation) — no router, no navigation library. A single screen mounts `DetourProvider` and renders the raw `useDetourContext()` state, so you can confirm the SDK is wired up before adding your own routing.

> 📸 **Screenshot — App running**
> _The single debug screen showing the live Detour link state: `isLinkProcessed`, `type`, `url`, and `route`, before and after a link is triggered._
>
> <!-- TODO: add ./assets/screenshots/app-expo-bare-link-state.png -->

## How it works

- `DetourProvider` is initialized with your SDK config.
- A single screen consumes `useDetourContext()`.
- No router/navigation integration is implemented here.
- The example is focused on exposing Detour link state.

## What this example is for

- Quick SDK smoke test in isolation.
- Verifying provider setup and context values.
- A base starting point before adding your own navigation/deep-link routing logic.

For a real routing flow, continue with:

- [`examples/expo-router`](../expo-router) — Expo Router
- [`examples/expo-router-advanced`](../expo-router-advanced) — Expo Router, auth-gated
- [`examples/react-navigation`](../react-navigation) — React Navigation

See the [`DetourContextType` / `DetourLink` API reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) for the full shape of the values shown on screen.

## Test flow

1. Start the app on iOS/Android.
2. Confirm the app renders and `isLinkProcessed` is `false`.
3. Trigger a Detour link (see [Triggering links](#triggering-links)).
4. Confirm `isLinkProcessed` flips to `true` and `type`, `url`, and `route` fields are populated on screen.

> 📸 **Screenshot — Resolved link state**
> _The screen after a link is resolved: `isLinkProcessed: true` with `type`, `url`, and `route` filled in._
>
> <!-- TODO: add ./assets/screenshots/app-expo-bare-resolved.png -->

## Set up Detour

You need a Detour account to register this app and generate its credentials. [Sign up](https://godetour.dev/auth/signup), open the [Detour Dashboard](https://godetour.dev), and follow the [Dashboard Walkthrough](https://detour.swmansion.com/docs/Fundamentals/dashboard).

### 1. Register the app

Create an organization and add a new app. Detour assigns it a base link URL of the form `https://<your-org>.godetour.link/<your-app-hash>`.

> 📸 **Screenshot — Dashboard › Apps**
> _The "New app" dialog: organization picker, app name, and the generated base link URL (`<your-org>.godetour.link/<your-app-hash>`)._
>
> <!-- TODO: add ./assets/screenshots/dashboard-create-app.png -->

→ [Dashboard › Apps](https://detour.swmansion.com/docs/Fundamentals/dashboard#apps)

### 2. Configure the platforms

Open **App configuration** and fill the iOS card (Bundle ID, Team ID, App Store ID) and the Android card (package name, SHA-256 certificates). The dashboard generates the `associatedDomains` and intent-filter snippets you paste into `app.json` ([below](#configuring-appjson)).

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
<summary>Universal / App link</summary>

Open a Detour HTTPS link:

```sh
# iOS simulator
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/"
```

</details>

<details>
<summary>Deferred link</summary>

Simulates a link clicked before the app was installed:

1. Copy a Detour link URL from the dashboard to your clipboard.
2. Kill or uninstall the app.
3. Relaunch — the SDK reads the clipboard on startup and resolves the link automatically.

</details>

For the full matrix of cases and gotchas, see [Testing & Troubleshooting](https://detour.swmansion.com/docs/sdk/react-native/testing).

## Quick start

- Install dependencies from the repo root: `pnpm install`
- Configure this app in the [Detour Dashboard](https://godetour.dev) using identifiers from `app.json` (for example `ios.bundleIdentifier`, `android.package`).
- Use the values from the dashboard's [API configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#api-configuration-and-key-security) section to fill `.env` and update `app.json` with the generated integration code.
- Run prebuild for this example: `pnpm prebuild`
- Start the example: `pnpm start`
- Run on device/simulator: `pnpm ios` or `pnpm android`

## Related

- [`examples/expo-router`](../expo-router) · [`examples/react-navigation`](../react-navigation)
- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) · [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference)
