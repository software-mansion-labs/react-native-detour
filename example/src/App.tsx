import { DetourProvider } from 'detour-react-native';

import { Screen } from './Screen';

export default function App() {
  return <DetourProvider API_KEY="ss">{<Screen />}</DetourProvider>;
}
