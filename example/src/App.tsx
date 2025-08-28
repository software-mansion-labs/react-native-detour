import { DetourProvider } from 'detour-react-native';

import { Screen } from './Screen';

export default function App() {
  return (
    <DetourProvider appID="example-id" API_KEY="sssss-sssss-sssss">
      {<Screen />}
    </DetourProvider>
  );
}
