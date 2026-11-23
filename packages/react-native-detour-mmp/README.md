# @swmansion/react-native-detour-mmp

The Detour React Native SDK with attribution: everything in [`@swmansion/react-native-detour`](https://github.com/software-mansion-labs/react-native-detour#readme), plus attribution of installs and conversions to ad networks.

> Not released yet. It ships together with the SDK's next major version.

## Installation

Install both packages:

```sh
npm install @swmansion/react-native-detour @swmansion/react-native-detour-mmp
```

The package has native iOS and Android code, so rebuild the app after installing it (`npx expo prebuild`, `npx expo run:ios` or `npx expo run:android`; in a React Native CLI app, `pod install` and a new Android build). It does not run in Expo Go: there the SDK works as without the native parts below. Like the core SDK, a React Native CLI app needs Expo Modules (see [Bare React Native CLI](https://github.com/software-mansion-labs/react-native-detour#bare-react-native-cli-without-expo) in the core README).

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

Then pass the user's consent with `setConsent` on every launch. With the option and consent to `attribution`, requests tell the Detour backend that the app uses attribution (`X-SDK-Package: mmp`), and the backend attributes installs to ad network campaigns, if your plan includes attribution. Without the option, before consent and after a refusal, requests go as `core` and do not feed attribution.

Sending data to ad networks needs one more purpose. The Detour backend sends an install or a conversion to a network set up for your app only with consent to `ad_network_sharing`; Google also needs `ad_personalization`. Without it the install is still attributed in Detour, but nothing goes to the network. Your consent prompt has to say this: that data is shared with ad networks (for example Google and Unity) and used to personalize ads.

An install is attributed from the deferred-matching request on its first launch. With attribution on, that request waits until the attribution gate decides, which happens when your app passes the user's choice: after consent to `attribution` it goes as `mmp`, after a refusal as `core`. `isLinkProcessed` turns true before the wait, so an app that holds its UI until then can still show its consent prompt. If the attribution gate is open for your app in the Detour server config, or the SDK cannot read it, the request goes at once. An app closed before the choice still matches on its next launch.

On every launch, call `Detour.setConsent` as soon as your consent platform has the choice, before you log events or conversions:

```ts
Detour.setConsent({
  purposes: {
    analytics: true,
    attribution: true,
    ad_network_sharing: true,
    ad_personalization: true,
  },
});
```

Set `autoStart: false` and call `Detour.start()` after the consent prompt only if the law that applies to you requires consent for the deferred-link match itself. Links the user taps are routed at once either way.

## iOS: SKAdNetwork, AdAttributionKit and Apple Search Ads

With attribution on and consent to `attribution` passed on this launch:

- On the first launch the install is registered for SKAdNetwork.
- `DetourAnalytics.logConversion` sets the SKAdNetwork conversion value, and from iOS 17.4 the AdAttributionKit one too. The rules that map a conversion to a value come from the Detour server, so changing them needs no app update. The value only goes up.
- The first deferred link request carries the Apple Search Ads attribution token, so an install from a Search Ads campaign is not counted as organic.

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

## Android: Meta Install Referrer

To attribute installs from Meta ads (Facebook, Instagram, Audience Network), pass your Meta app ID:

```tsx
<DetourProvider config={{ appID, apiKey, attribution: attribution({ facebookAppId: "your-meta-app-id" }) }}>
```

The first deferred link request then carries the [Meta Install Referrer](https://developers.facebook.com/documentation/app-ads/meta-install-referrer), read from the Facebook, Instagram or Facebook Lite app on the device. It goes only with consent to `attribution`, still encrypted; the Detour backend decrypts it with your app's Install Referrer Decryption Key. Without one of those apps there is nothing to read. On iOS the option does nothing.

The app must list those apps in `AndroidManifest.xml`, or Android hides them from it. With Expo, turn on the plugin option:

```json
{
  "expo": {
    "plugins": [["@swmansion/react-native-detour-mmp", { "metaInstallReferrer": true }]]
  }
}
```

In a React Native CLI app, add them to `android/app/src/main/AndroidManifest.xml` yourself:

```xml
<queries>
    <package android:name="com.facebook.katana" />
    <package android:name="com.instagram.android" />
    <package android:name="com.facebook.lite" />
</queries>
```
