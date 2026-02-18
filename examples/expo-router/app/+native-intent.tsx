import { createDetourNativeIntentHandler } from '@swmansion/react-native-detour';

// Example of a custom native intent handler that delegates to Detour for processing.
// It detects links from Detour domain by default, but you can customize it further with the `hosts` option to fit your needs.
export const redirectSystemPath = createDetourNativeIntentHandler({
  fallbackPath: '',
});
