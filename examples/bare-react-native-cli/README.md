# Detour Bare React Native CLI Example

The most minimal integration of [`@swmansion/react-native-detour`](https://detour.swmansion.com/docs/sdk/react-native/sdk-installation) in a **bare React Native CLI** project — created with `@react-native-community/cli`, no Expo tooling for the project itself. `DetourProvider` is initialized with SDK config and a single screen renders the raw `useDetourContext()` state. No router or navigation.

This example exists to show the **native setup**, not routing. Detour's peer dependencies (`expo-application`, `expo-constants`, `expo-localization`, `expo-clipboard`) are Expo Modules with native code. In an Expo project they autolink automatically; in a bare React Native CLI project you add them with [`install-expo-modules`](https://docs.expo.dev/bare/installing-expo-modules/) and point Metro at `expo/metro-config`. The [setup script](#generate-the-native-project) does this for you.

> Verified with **React Native 0.83.4** + **Expo SDK 55**. The same approach applies to React Native 0.85+ / newer Expo SDKs — only the pinned versions change.

Use this as a quick SDK smoke test for the CLI flow, or as a base before adding your own routing.

**Related examples:**

- [`examples/expo-bare`](../expo-bare) — the same minimal screen, but as an Expo project
- [`examples/react-navigation`](../react-navigation) — minimal React Navigation integration
- [`examples/expo-router`](../expo-router) — minimal Expo Router integration

## Why `expo/metro-config` is required

`install-expo-modules` switches Android/iOS JS bundling to Expo CLI's `export:embed`. That serializer expects `metro.config.js` to extend `expo/metro-config` (a superset of `@react-native/metro-config`, safe in a bare project). If it stays on `@react-native/metro-config`, the release build fails with:

```
Error: Serializer did not return expected format. The project copy of `expo/metro-config`
may be out of date. Error: Unexpected token 'v', "var __BUND"... is not valid JSON
```

This example ships the correct [`metro.config.js`](./metro.config.js) — see [Troubleshooting](#troubleshooting) if you hit related errors.

## Generate the native project

The native `android/` and `ios/` projects are **not committed** (they are large and version-bound). Generate them once with the setup script:

```sh
# from the repo root
pnpm install

# generate android/ + ios/ and wire in Expo Modules
pnpm examples:bare-react-native-cli setup
```

The script ([`scripts/setup.sh`](./scripts/setup.sh)):

1. Scaffolds a throwaway app with `@react-native-community/cli init` (pinned to this example's `react-native` version) and copies its `android/` and `ios/` here.
2. Runs `install-expo-modules` so the Expo peer modules autolink.
3. Restores this example's monorepo-aware `metro.config.js`.

> If you use **nvm**, run `nvm use` before the script — gradle invokes `node` at build time and it must be on `PATH`.

## Test flow

Launch the app — once the startup check completes, `isLinkProcessed` turns `true`. With no pending link, `type`, `url`, and `route` are empty.

Trigger a Universal/App link (see [Triggering links](#triggering-links)) — `type`, `url`, and `route` populate with the resolved link data.

To test the **deferred** case: follow the [Deferred deep link](#triggering-links) setup before installing. The deferred check only runs once — the SDK writes a persistent flag on first launch, so subsequent launches skip it. Reinstalling is needed to re-trigger the deferred path.

## Set up Detour

You need a Detour account to register this app and generate its credentials. [Sign up](https://godetour.dev/auth/signup) and open the [Detour Dashboard](https://godetour.dev). If you run into issues during setup, the [Dashboard Walkthrough](https://detour.swmansion.com/docs/Fundamentals/dashboard) covers each step in detail.

### 1. Register the app

Create an organization and add a new app. Detour assigns it a base link URL of the form `https://<your-org>.godetour.link/<your-app-hash>` visible in the **Link settings** section.

> The fallback Redirect URL in **Link settings** only controls where **web** traffic lands — it has no effect on the deferred or Universal/App link flows this example tests, so it can be left empty or filled with a placeholder for local development.

→ [Dashboard › Apps](https://detour.swmansion.com/docs/Fundamentals/dashboard#apps)

### 2. Configure the platforms

Open **App configuration** and fill in the platform details. Use the identifiers from the **generated** native projects (or change them to your own):

- **iOS:** the Bundle ID in `ios/<AppName>.xcodeproj` (`PRODUCT_BUNDLE_IDENTIFIER`). Provide your real Apple Developer Team ID (`DEVELOPMENT_TEAM` in Xcode › Signing & Capabilities) — a placeholder or mismatched Team ID makes the Universal link open in Safari instead of the app.
- **Android:** the `applicationId` in `android/app/build.gradle`, plus a SHA-256 certificate fingerprint. The **fingerprint must match the keystore that signs the build** — for local development (`pnpm android`), use the **debug keystore** fingerprint. See [Testing Android App Links](https://detour.swmansion.com/docs/sdk/react-native/testing#testing-android-app-links).

The dashboard generates the iOS `associatedDomains` entry and the Android intent-filter snippet. In a bare project you add these to the **native files directly** (not `app.json`):

- **iOS** — add the associated domain in Xcode › Signing & Capabilities › Associated Domains: `applinks:<your-org>.godetour.link` (append `?mode=developer` for local Universal Link testing).
- **Android** — add the `<intent-filter>` with `android:autoVerify="true"` for `https://<your-org>.godetour.link/<your-app-hash>` to the main activity in `android/app/src/main/AndroidManifest.xml`.

> For a production integration, fill all fields with real values. See [App configuration](https://detour.swmansion.com/docs/Fundamentals/getting-started#app-configuration).

→ [Dashboard › App configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#app-configuration)

### 3. Copy your credentials

Open **API configuration** and copy your `appID` and publishable `apiKey` into this example's `.env`:

```sh
cp .env.example .env
# then set EXPO_PUBLIC_DETOUR_API_KEY and EXPO_PUBLIC_DETOUR_APP_ID
```

> `EXPO_PUBLIC_*` variables are inlined by `babel-preset-expo` — this works in a bare project too because this example uses `expo/metro-config` + `babel-preset-expo`.

→ [Dashboard › API configuration](https://detour.swmansion.com/docs/Fundamentals/dashboard#api-configuration-and-key-security)

## Triggering links

<details>
<summary>Deferred deep link</summary>

1. Uninstall the app or clear its data to start from a clean state.
2. Open a Detour link in the device's mobile browser.
3. Install and launch the app — the SDK resolves the link automatically.

> **Note:** On Android, the install referrer is typically unavailable in development builds, so deferred matching falls back to probabilistic signals only. See [Limitations & Known Issues](https://detour.swmansion.com/docs/Architecture/architecture-limitations).

On iOS you can also copy the link to the clipboard before uninstalling — the SDK reads the clipboard on first launch (`shouldUseClipboard: true`), so you can skip the browser step.

</details>

<details>
<summary>Universal / App link</summary>

```sh
# iOS simulator
xcrun simctl openurl booted "https://<your-org>.godetour.link/<your-app-hash>/"

# Android emulator
adb shell am start -a android.intent.action.VIEW -d "https://<your-org>.godetour.link/<your-app-hash>/"
```

Alternatively, paste the link into Notes or Messages on the device and tap it.

</details>

For more cases and gotchas, see [Testing & Troubleshooting](https://detour.swmansion.com/docs/sdk/react-native/testing).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| iOS at launch: `Cannot read property '…' of undefined` | Expo native modules not linked | Run the [setup](#generate-the-native-project) (`install-expo-modules`) and reinstall pods |
| Android release: `Serializer did not return expected format … Unexpected token 'v', "var __BUND"…` | `metro.config.js` on `@react-native/metro-config` while Expo's `export:embed` bundler is active | Use `expo/metro-config` (already set in this example) |
| `The NODE_ENV environment variable is required but was not specified` | `export:embed` run without an env | Set `NODE_ENV=production` for the release build |
| `cliFile … is not a file … it was a directory` | `@expo/cli` not hoisted to a resolvable `node_modules` | Add it explicitly: `pnpm --filter @swmansion/react-native-detour-bare-react-native-cli add @expo/cli` |
| Bundling fails with `node` not found | `node` not on the gradle process's `PATH` (nvm) | `nvm use` before building; restart the gradle daemon (`./gradlew --stop`) |

## Quick start

```sh
# from the repo root
pnpm install
pnpm examples:bare-react-native-cli setup   # generates android/ + ios/
cp examples/bare-react-native-cli/.env.example examples/bare-react-native-cli/.env
# fill .env with your Detour credentials, then:
pnpm examples:bare-react-native-cli ios      # or: ... android
```

## See also

- [SDK Usage](https://detour.swmansion.com/docs/sdk/react-native/sdk-usage) — how to integrate Detour with your navigation library
- [API Reference](https://detour.swmansion.com/docs/sdk/react-native/api-reference) — full type and method reference
- [Installing Expo modules in an existing project](https://docs.expo.dev/bare/installing-expo-modules/) — the underlying Expo guide
