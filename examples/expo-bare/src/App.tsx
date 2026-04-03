import { type Config, DetourProvider } from "@swmansion/react-native-detour";

import { Screen } from "./Screen";

export default function App() {
  const config: Config = {
    apiKey: process.env.EXPO_PUBLIC_DETOUR_API_KEY!,
    appID: process.env.EXPO_PUBLIC_DETOUR_APP_ID!,
    shouldUseClipboard: true,
  };

  return (
    <DetourProvider config={config}>
      <Screen />
    </DetourProvider>
  );
}
