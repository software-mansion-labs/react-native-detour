# @swmansion/react-native-detour-mmp

The Detour React Native SDK with attribution: everything in [`@swmansion/react-native-detour`](https://github.com/software-mansion-labs/react-native-detour#readme), plus attribution of installs and conversions to ad networks.

> Not released yet. It ships together with the SDK's next major version.

## Installation

Install both packages:

```sh
npm install @swmansion/react-native-detour @swmansion/react-native-detour-mmp
```

Use the SDK as described in the core README. You can import from either package; this one re-exports the core SDK:

```tsx
import { DetourProvider } from "@swmansion/react-native-detour-mmp";
import { createDetourNativeIntentHandler } from "@swmansion/react-native-detour-mmp/expo-router";
```

## What it changes

With this package installed and the user's consent for attribution, requests tell the Detour backend that the app uses attribution (`X-SDK-Package: mmp`). Pass that consent with `setConsent` on every launch, for example `{ purposes: { attribution: true } }`: until then, and after a refusal, requests go as `core` and do not feed attribution. The backend then attributes installs to ad network campaigns and sends postbacks to the networks set up for your app, if your plan includes attribution. Without the package, the core SDK reports `core` and its requests never feed attribution.

This version adds no native code and collects nothing beyond the core SDK. Native attribution (SKAdNetwork, AdAttributionKit, Apple Search Ads) and its privacy manifest come in a later version.
