# Detour Expo Router Example (Advanced)

An auth-gated [Expo Router](https://docs.expo.dev/router/introduction/) flow where a deep link is held until the user signs in, then replayed at the right screen. For a minimal setup, start with [`examples/expo-router`](../expo-router).

> 📸 **Screenshot — Auth-gated flow**
> _Three frames: (1) a Detour link arrives on the signed-out `/` screen and the pending route is shown; (2) the user taps **Sign in**; (3) the app redirects to the captured deep-link route._
>
> <!-- TODO: add ./assets/screenshots/app-advanced-auth-gated-flow.png -->

## How it works

- `/` for signed-out users, `/home` for signed-in users.
- When a link arrives while signed out, it is stored as a pending route and Detour context is cleared.
- After sign-in, the app redirects to the pending route.
- `src/app/+native-intent.tsx` intercepts Detour domains and other URL-like paths before Expo Router routing.

→ [SDK Usage docs](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) · [deferred deep linking blog series](https://swmansion.com/blog/integrating-deferred-deep-linking-in-react-native-apps-1/)

## Test flow

1. Start the app on iOS/Android.
2. You land on `/` (signed out).
3. Trigger a Detour Universal/App link to `/details` (or any route) while signed out (see [Triggering links](#triggering-links)).
   - The link is captured, context is cleared, and the app stays on `/`.
   - You should see the pending route displayed on the screen.
4. Tap **Sign in**.
5. The app should now redirect to the deep link route.
6. Return to `/home` — the same link should **not** trigger again.

> 📸 **Screenshot — Pending route captured**
> _The signed-out `/` screen displaying the captured pending route before sign-in._
>
> <!-- TODO: add ./assets/screenshots/app-advanced-pending-route.png -->

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

Because the deferred case is central here, you may want to review the **Matching** settings (threshold and time window) that control how a pre-install click is paired with the first launch.

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
npx uri-scheme open "detour-expo-router-advanced://app/anything" --ios

# Android emulator
npx uri-scheme open "detour-expo-router-advanced://app/anything" --android
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

- [`examples/expo-router`](../expo-router) — minimal integration
- [`examples/expo-router-native-intent`](../expo-router-native-intent) — route directly via `+native-intent`
- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) — how to integrate Detour with your navigation library
- [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) — full type and method reference
