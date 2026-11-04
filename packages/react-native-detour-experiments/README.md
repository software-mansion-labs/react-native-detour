# `@swmansion/react-native-detour-experiments`

Detour Experiments: experiments with two to six variants (A/B/n) and feature flags for Expo and React Native, declared in TypeScript. The package contains the SDK, the `detour-experiments` CLI, and an MCP server for coding agents.

**Documentation: [detour.swmansion.com/docs/experiments](https://detour.swmansion.com/docs/experiments/)**

## Install

```bash
npx @swmansion/react-native-detour-experiments init
```

`init` installs the package, writes `detour-experiments.config.json` and an empty registry, stores a CLI key for your Detour app, and adds the MCP server to your editors.

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

Install `@react-native-async-storage/async-storage` if the app does not have it. Without a persistent storage, a device gets a new device ID, and can get another variant, on every cold start. See [Setup](https://detour.swmansion.com/docs/experiments/getting-started/setup/).

## Usage

Run the CLI through your package manager, for example `npx detour-experiments doctor`.

```bash
detour-experiments new experiment PromoBanner --component src/components/Header.tsx --metric cta_click
detour-experiments doctor PromoBanner                   # also the check to run in CI
detour-experiments update PromoBanner --target-mde 0.05 # set the test plan before the rollout
detour-experiments update PromoBanner --rollout 50      # after a build with the experiment ships
detour-experiments stats PromoBanner
detour-experiments conclude PromoBanner --winner B
```

```tsx
const { variant, logOutcome } = useExperiment(PromoBanner);
const { enabled } = useFeatureFlag(DarkMode);
```

`init`, `login`, and `capture-consent` need a terminal. A coding agent runs the other steps through the MCP server. See [MCP Quickstart](https://detour.swmansion.com/docs/experiments/getting-started/mcp-quickstart/).

## Guides

- [Add a Feature Flag](https://detour.swmansion.com/docs/experiments/getting-started/add-a-flag/)
- [Add an Experiment](https://detour.swmansion.com/docs/experiments/getting-started/add-an-experiment/)
- [Plan the Test](https://detour.swmansion.com/docs/experiments/getting-started/plan-the-test/)
- [Ship and Roll Out](https://detour.swmansion.com/docs/experiments/getting-started/ship-and-roll-out/)
- [Read and Conclude](https://detour.swmansion.com/docs/experiments/getting-started/read-and-conclude/)
- [CLI Reference](https://detour.swmansion.com/docs/experiments/sdk-cli/cli/)
