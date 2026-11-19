# @swmansion/react-native-detour-mmp

The Detour React Native SDK with attribution: everything in [`@swmansion/react-native-detour`](https://github.com/software-mansion-labs/react-native-detour#readme), plus attribution of installs and conversions to ad networks.

> Not released yet. It ships together with the SDK's next major version.

## Installation

Install both packages:

```sh
npm install @swmansion/react-native-detour @swmansion/react-native-detour-mmp
```

The package has native iOS code, so rebuild the app after installing it (`npx expo prebuild` or `npx expo run:ios`; in a React Native CLI app, `pod install`). It does not run in Expo Go: there the SDK works as without attribution on iOS. Like the core SDK, a React Native CLI app needs Expo Modules (see [Bare React Native CLI](https://github.com/software-mansion-labs/react-native-detour#bare-react-native-cli-without-expo) in the core README).

Use the SDK as described in the core README. You can import from either package; this one re-exports the core SDK:

```tsx
import { DetourProvider } from "@swmansion/react-native-detour-mmp";
import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour-mmp/expo-router";
```

## Turning attribution on

Installing the package does not turn attribution on. Pass `attribution()` in the config:

```tsx
import { DetourProvider, attribution } from "@swmansion/react-native-detour-mmp";

<DetourProvider config={{ appID, apiKey, attribution: attribution() }}>
```

Then pass the user's consent with `setConsent` on every launch, for example `{ purposes: { attribution: true } }`. With both, requests tell the Detour backend that the app uses attribution (`X-SDK-Package: mmp`), and the backend attributes installs to ad network campaigns and sends postbacks to the networks set up for your app, if your plan includes attribution. Without the option, before consent and after a refusal, requests go as `core` and do not feed attribution.

An install is attributed from the deferred-matching request on its first launch. With the default `autoStart: true` that request goes out when `DetourProvider` mounts, before your consent prompt, so it goes as `core` and the install is not attributed. With attribution:

1. Set `autoStart: false`.
2. On every launch, call `Detour.setConsent` as soon as your consent platform has the choice, before you log events or conversions.
3. Then call `Detour.start()`.

```tsx
<DetourProvider config={{ appID, apiKey, attribution: attribution(), autoStart: false }}>
```

```ts
Detour.setConsent({ purposes: { analytics: true, attribution: true } });
Detour.start();
```

The deferred link then waits for the consent prompt. Links the user taps are routed at once either way.

## iOS: SKAdNetwork, AdAttributionKit and Apple Search Ads

With attribution on and consent to `attribution` passed on this launch:

- On the first launch the install is registered for SKAdNetwork.
- `DetourAnalytics.logConversion` sets the SKAdNetwork conversion value, and from iOS 17.4 the AdAttributionKit one too. The rules that map a conversion to a value come from the Detour server, so changing them needs no app update. The value only goes up.
- The first deferred link request carries the Apple Search Ads attribution token, so an install from a Search Ads campaign is not counted as organic.

On Android the package adds nothing native: requests still go as `mmp` and feed attribution on the Detour backend.

### Info.plist

Your app needs no ad network identifiers for its installs to be attributed: `SKAdNetworkItems` belongs in apps that display ads, not in the app being advertised. Apple sends each winning postback to the ad network; to let Detour receive a copy, `Info.plist` needs two keys:

```xml
<key>NSAdvertisingAttributionReportEndpoint</key>
<string>https://godetour.dev</string>
<key>AttributionCopyEndpoint</key>
<string>https://godetour.dev</string>
```

With Expo, the config plugin adds them on `expo prebuild`:

```json
{
  "expo": {
    "plugins": ["@swmansion/react-native-detour-mmp"]
  }
}
```

In a React Native CLI app, add them to `ios/<YourApp>/Info.plist` yourself. Each key takes one URL: if your app already sets one, for example for another attribution provider, the plugin keeps it and warns, and the copies go there. The SDK logs a warning at start when a key is missing.

> Detour does not process these copies yet. Adding the keys now means your next release does not need another `Info.plist` change.

### Privacy

The package has its own `PrivacyInfo.xcprivacy`, added to your app by CocoaPods, also without `expo prebuild`. It declares `NSPrivacyTracking = true` with no tracking domains, so the Privacy Report of an app with it shows tracking. It collects no data of its own beyond the core SDK: it sends the conversion values to Apple and the Apple Search Ads token to Detour. Detour never shows the App Tracking Transparency prompt; whether your app needs it depends on how it uses the data.
