import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  DetourProvider,
  useDetourContext,
  type Config,
} from '@swmansion/react-native-detour';

const detourConfig: Config = {
  API_KEY: 'ssss-ssss-ssss',
  appID: 'app-id-from-dashboard',
  shouldUseClipboard: true,
};

const DetourGate = () => {
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLinkProcessed || !linkRoute) return;

    router.replace(linkRoute);
    clearLink();
  }, [clearLink, isLinkProcessed, linkRoute, router]);

  return null;
};

export default function RootLayout() {
  return (
    <DetourProvider config={detourConfig}>
      <DetourGate />
      <Stack />
    </DetourProvider>
  );
}
