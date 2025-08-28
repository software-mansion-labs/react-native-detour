import { DetourProvider, type Config } from 'detour-react-native';

import { Screen } from './Screen';

export default function App() {
  const config: Config = {
    API_KEY: 'ssss-ssss-ssss',
    appID: 'app-id-from-dashboard',
    shouldUseClipboard: true,
  };

  return <DetourProvider config={config}>{<Screen />}</DetourProvider>;
}
