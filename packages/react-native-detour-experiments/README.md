# `@swmansion/react-native-detour-experiments`

Detour Experiments: experiments with two to six variants (A/B/n) and feature flags for Expo and React Native, declared in TypeScript. This package is the SDK. The `detour` CLI and the MCP server for coding agents are in the `@swmansion/detour-cli` package.

**Documentation: [detour.swmansion.com/docs/experiments](https://detour.swmansion.com/docs/experiments/)**

## Install

```bash
npx @swmansion/detour-cli init
```

`init` installs this package, writes `detour-experiments.config.json` and an empty registry, stores a CLI key for your Detour app, and adds the MCP server to your editors.

Then wrap the root layout in the provider:

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

import { DetourExperimentsProvider } from "@swmansion/react-native-detour-experiments";

import registry from "../src/experiments";

const detourConfig = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID,
};

export default function RootLayout() {
  return (
    <DetourExperimentsProvider registry={registry} detourConfig={detourConfig}>
      <Stack />
    </DetourExperimentsProvider>
  );
}
```

The SDK needs React 18 or newer and React Native 0.72 or newer. In an app that also uses `@swmansion/react-native-detour`, it needs version 2.5.0 or newer of that package: older versions have no `getDetourDeviceId`, which is how both SDKs get the same device ID from the first launch.

Install `@react-native-async-storage/async-storage` if the app does not have it. Without a persistent storage, a device gets a new device ID, and can get another variant, on every cold start. See [Setup](https://detour.swmansion.com/docs/experiments/getting-started/setup/).

### Consent

Pass `enabled={false}` until the user consents. While it is off, `useExperiment` returns the control variant and `useFeatureFlag` the flag's default, and the SDK stores, fetches and sends nothing. Turning it on starts the SDK. When consent is withdrawn, turn it off again and call `clearExperimentsData()` to drop the queued events and the cached remote config:

```tsx
<DetourExperimentsProvider registry={registry} detourConfig={detourConfig} enabled={hasConsent}>
```

```ts
await clearExperimentsData({ storage: detourConfig.storage, appID: detourConfig.appID });
```

In an app with `@swmansion/react-native-detour`, the device ID is not cleared: it belongs to that SDK, which shares it. Without it, this package created the device ID, so `clearExperimentsData()` removes it as well.

## Usage

Run the CLI through your package manager, for example `npx detour doctor`.

```bash
detour new experiment PromoBanner --component src/components/Header.tsx --metric cta_click
detour doctor PromoBanner                   # also the check to run in CI
detour update PromoBanner --target-mde 0.05 # set the test plan before the rollout
detour update PromoBanner --rollout 50      # after a build with the experiment ships
detour stats PromoBanner
detour conclude PromoBanner --winner B
```

```tsx
const { variant, logOutcome } = useExperiment(PromoBanner);
const { enabled } = useFeatureFlag(DarkMode);
```

`init` and `login` need a terminal. Before the first experiment or flag, an owner or admin of your Organization accepts the Experiments terms in the dashboard's Experiments tab. A coding agent runs the other steps through the MCP server. See [MCP Quickstart](https://detour.swmansion.com/docs/experiments/getting-started/mcp-quickstart/).

## Guides

- [Add a Feature Flag](https://detour.swmansion.com/docs/experiments/getting-started/add-a-flag/)
- [Add an Experiment](https://detour.swmansion.com/docs/experiments/getting-started/add-an-experiment/)
- [Plan the Test](https://detour.swmansion.com/docs/experiments/getting-started/plan-the-test/)
- [Ship and Roll Out](https://detour.swmansion.com/docs/experiments/getting-started/ship-and-roll-out/)
- [Read and Conclude](https://detour.swmansion.com/docs/experiments/getting-started/read-and-conclude/)
- [CLI Reference](https://detour.swmansion.com/docs/experiments/sdk-cli/cli/)
