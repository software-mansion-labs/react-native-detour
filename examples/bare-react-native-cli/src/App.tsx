import { SafeAreaProvider } from "react-native-safe-area-context";

import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { Screen } from "./Screen";

const config: Config = {
  apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
  appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
  shouldUseClipboard: true,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <DetourProvider config={config}>
        <Screen />
      </DetourProvider>
    </SafeAreaProvider>
  );
}
