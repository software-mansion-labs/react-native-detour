# Detour Expo Router Native Intent Example

Demonstrates the Expo Router **native-intent API** from [`@swmansion/react-native-detour/expo-router`](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage). Unlike the [minimal Expo Router example](../expo-router), this app resolves Detour links inside `+native-intent.tsx`, so Expo Router receives the final route directly — without the temporary fallback-route jump.

> 📸 **Screenshot — App running**
> _A Detour Universal/App link opening straight into `/details` with no intermediate screen flash — contrasted against the fallback-then-redirect behavior of the minimal example._
>
> <!-- TODO: add ./assets/screenshots/app-native-intent-direct-route.png -->

## How it works

This app uses `createDetourNativeIntentHandler` in **resolve mode**:

- `src/app/+native-intent.tsx` calls `createDetourNativeIntentHandler(...)`, resolves Detour short links, and maps them to Expo Router paths via `mapToRoute`.
- `src/app/_layout.tsx` uses `linkProcessingMode: 'deferred-only'` — native-intent handles runtime links; `DetourProvider` only processes deferred ones.

Result: Expo Router receives the final route directly, without a fallback-route jump.

→ [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) · [Click Handling & Redirect Flow](https://detour.swmansion.com/docs/Fundamentals/dashboard#links-behavior-runtime-flow)

## Related examples

- [`examples/expo-router`](../expo-router) — minimal integration.
- [`examples/expo-router-advanced`](../expo-router-advanced) — auth-gated routing flow.

## Test flow

1. Start the app on iOS/Android.
2. You land on `/`.
3. Trigger a Detour Universal/App link (normal or short) that should resolve to `/details` (see [Triggering links](#triggering-links)).
4. Native intent resolves/maps the link and routes directly to `/details`.
5. Return to `/` — the same link should **not** trigger again in the current session.

> 📸 **Screenshot — Result screen**
> _The `/details` screen reached via native-intent resolution, with the resolved path and any forwarded params visible._
>
> <!-- TODO: add ./assets/screenshots/app-native-intent-result.png -->

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

Open **API configuration** and copy your `appID` and publishable `apiKey` into this example's `.env` — these are the values `+native-intent.tsx` passes to `createDetourNativeIntentHandler`.

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
<summary>Deferred deep link</summary>

Follow these steps to test the deferred flow:

1. Reinstall the app or clear its data to start from a clean state.
2. Open a Detour link in the device's mobile browser.
3. Install and launch the app — the SDK resolves the link automatically.

> **Note:** On Android, the install referrer is typically unavailable in development builds, so deferred matching falls back to probabilistic signals (IP, device fingerprint) only. See [Limitations & Known Issues](https://detour.swmansion.com/docs/Architecture/architecture-limitations).

Alternatively on iOS, you can also copy the link to your clipboard before uninstalling — the SDK reads the clipboard on first launch (`shouldUseClipboard: true`), so you can skip the browser step. It simulates a link clicked before the app was installed.

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

- [`examples/expo-router`](../expo-router) — minimal integration
- [`examples/expo-router-advanced`](../expo-router-advanced) — auth-gated routing flow
- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) — how to integrate Detour with your navigation library
- [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) — full type and method reference
