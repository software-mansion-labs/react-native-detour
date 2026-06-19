# Detour Expo Router Example (Advanced)

An auth-gated [Expo Router](https://docs.expo.dev/router/introduction/) flow where an incoming deep link is held until the user signs in and clears first-launch onboarding, then replayed at the target screen. Navigation is driven entirely by `useDetourGate` in the root layout — it waits until Detour finishes processing, then routes on auth and onboarding state.

**Related examples:**

- [`examples/expo-router`](../expo-router) — minimal Expo Router integration
- [`examples/expo-router-native-intent`](../expo-router-native-intent) — route directly via `+native-intent`

<br>
<div style="display: flex; gap: 10px;">
  <img src="assets/screenshots/app-sign-in.png" alt="Sign-in screen with a Detour link pending" width="30%"/>
  <img src="assets/screenshots/app-onboarding.png" alt="First-launch onboarding screen" width="30%"/>
  <img src="assets/screenshots/app-details.png" alt="Details screen reached after the pending link is replayed" width="30%"/>
</div>
<br>

> _**Auth-gated flow**. A Detour link arrives while signed out, so the app waits on the sign-in screen (left) → after signing in, a first-time user goes through onboarding (center) → the pending link is replayed and the app lands on Details (right)._

## Test flow

**Deferred link**

1. Follow the [Deferred deep link](#triggering-links) setup to register a pre-install click, then install and launch the app signed out. The deferred match runs only on this fresh first launch.
2. You land on `/sign-in` — Detour has matched the click and is holding the link in context, so a **Link pending** banner appears.
3. Tap **Sign in**, then tap **Get Started** on the onboarding screen (shown on the first launch).
4. The held link is replayed and the app lands on `/details`, with the forwarded params visible.
5. Switch back to the tabs — the same link does **not** trigger again (the gate already cleared it).

**Universal / App link**

Same flow as above but don't need to reinstall — the link arrives at runtime. While signed out (tap **Logout** to get there), trigger a Detour link to `/details` (see [Triggering links](#triggering-links)). On later launches the onboarding step is skipped.

## Set up Detour

You need a Detour account to register this app and generate its credentials. [Sign up](https://godetour.dev/auth/signup) and open the [Detour Dashboard](https://godetour.dev). If you run into issues during setup, the [Dashboard Walkthrough](https://detour.swmansion.com/docs/Fundamentals/dashboard) covers each step in detail.

### 1. Register the app

Create an organization and add a new app. Detour assigns it a base link URL of the form `https://<your-org>.godetour.link/<your-app-hash>` visible in **Link settings** section.

> In **Link settings**, the dashboard asks for a fallback Redirect URL to mark setup as complete. It only controls where **web** traffic lands — it has no effect on the deferred or Universal/App link flows these examples test, so it can be left empty or filled with a placeholder URL for local development. For production, see [Full app configuration](https://detour.swmansion.com/docs/Fundamentals/getting-started#4-complete-app-configuration).

→ [Dashboard › Apps](https://detour.swmansion.com/docs/Fundamentals/dashboard#apps)

<div style="display: flex; gap: 10px; margin-bottom: 10px">
  <img src="assets/screenshots/dashboard-create-app-a.png" alt="Detour Dashboard organization creator" width="50%"/>
  <img src="assets/screenshots/dashboard-create-app-b.png" alt="Detour Dashboard app creator" width="50%"/>
</div>
<img src="assets/screenshots/dashboard-create-app-c.png" alt="Detour Dashboard app link details"/>
<br>

> **Dashboard**. _Create an organization (top-left), create a new app (top-right), and use the generated link (marked with red) in Link settings (bottom)._

### 2. Configure the platforms

Open **App configuration** and fill in the platform details:

- **iOS:** set Bundle ID to `detourreactnative.exporouteradvanced` and provide Team ID and App Store ID. The **Team ID must be your real Apple Developer Team ID** — the one the build is signed with (`DEVELOPMENT_TEAM` in Xcode › Signing & Capabilities, also shown under [Apple Developer › Membership](https://developer.apple.com/account)). A placeholder or mismatched Team ID makes the Universal link open in Safari instead of the app. The App Store ID can stay a placeholder for local development.
- **Android:** set package name to `detourreactnative.exporouteradvanced` and add a SHA-256 certificate fingerprint. The **fingerprint must match the keystore that signs the build** — a wrong value makes Android open the App link in the browser instead of the app. For local development (`npx expo run:android`), use the **local debug keystore** fingerprint. See [Testing Android App Links](https://detour.swmansion.com/docs/sdk/react-native/testing#testing-android-app-links) for more info.

The dashboard generates the `associatedDomains` and intent-filter snippets to paste into `app.json` ([below](#configuring-appjson)).

> For a production integration, fill all fields with real values. See [App configuration](https://detour.swmansion.com/docs/Fundamentals/getting-started#app-configuration) for full guidance.

→ [Dashboard › App configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#app-configuration)

<img src="assets/screenshots/dashboard-app-configuration.png" alt="Detour Dashboard App configuration"/>
<br>

> **Dashboard › App configuration**. _iOS and Android filled configurations with generated integration code snippets ready to copy._

### 3. Copy your credentials

Open **API configuration** and copy your `appID` and publishable `apiKey` into this example's `.env`.

→ [Dashboard › API configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#api-configuration-and-key-security)

<img src="assets/screenshots/dashboard-api-configuration.png" alt="Detour Dashboard API configuration"/>
<br>

> **Dashboard › API configuration**. _The API configuration panel with `appID` and the publishable `apiKey` ready to copy._

### 4. (Optional) Tune deferred-link matching

Because the deferred case is central here, you may want to review the **Matching** settings (threshold and time window) that control how a pre-install click is paired with the first launch.

→ [Matching](https://detour.swmansion.com/docs/Architecture/matching)

<img src="assets/screenshots/dashboard-matching.png" alt="Detour Dashboard Matching configuration"/>
<br>

> **Dashboard › Link Settings › Matching**. _The matching panel showing confidence threshold and time-window controls alongside match statistics._

## Configuring app.json

Replace the placeholders in `app.json` with the values from the dashboard's [App configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#app-configuration) section:

- `<your-org>` — your organization slug
- `<your-app-hash>` — the path prefix assigned to your app

```json
"ios": {
  // ...
  "associatedDomains": ["applinks:<your-org>.godetour.link"]
},
"android": {
  // ...
  "intentFilters": [{
    // ...
    "data": [{ "scheme": "https", "host": "<your-org>.godetour.link", "pathPrefix": "/<your-app-hash>" }]
  }]
}
```

> **Universal Links not opening the app?** Add `?mode=developer` to the `associatedDomains` entry: `"applinks:<your-org>.godetour.link?mode=developer"`. This bypasses Apple's CDN and fetches the AASA file directly from your domain on every launch instead of relying on a potentially stale cached version. Requires **Settings → Developer → Associated Domains Development** to be enabled on the device and a development-signed build. Remove it before submitting to TestFlight or the App Store.

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
npx uri-scheme open "detour-expo-router-advanced://(app)/details" --ios

# Android emulator
npx uri-scheme open "detour-expo-router-advanced://(app)/details" --android
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

- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) — how to integrate Detour with your navigation library
- [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) — full type and method reference
- [`examples/expo-router`](../expo-router) — minimal Expo Router integration
- [`examples/expo-router-native-intent`](../expo-router-native-intent) — route directly via `+native-intent`
