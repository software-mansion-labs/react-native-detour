import { DetourProvider, type Config } from '@swmansion/react-native-detour';

import { Screen } from './Screen';

export default function App() {
  const config: Config = {
    API_KEY: 'ssss-ssss-ssss',
    appID: 'app-id-from-dashboard',
    shouldUseClipboard: true,
  };

  return <DetourProvider config={config}>{<Screen />}</DetourProvider>;
}
