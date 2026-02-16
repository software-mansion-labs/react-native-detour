import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';

export const redirectSystemPath = createDetourNativeIntentHandler({
  fallbackPath: '',
});
