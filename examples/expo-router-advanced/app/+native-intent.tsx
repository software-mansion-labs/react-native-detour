import {
  createDetourNativeIntentHandler,
  type NativeIntentArgs,
} from '@swmansion/react-native-detour';
import { applicationName } from 'expo-application';

// Example of a custom native intent handler that first delegates to Detour for processing,
const detourHandler = createDetourNativeIntentHandler({
  fallbackPath: '',
  hosts: [/\.godetour\.link$/i],
});

export async function redirectSystemPath(args: NativeIntentArgs) {
  // First let Detour process the incoming path to handle any matching deferred links.
  const detourResult = await detourHandler(args);
  if (detourResult !== args.path) {
    return detourResult;
  }

  // Example of custom native intent handling logic that coexists with Detour.
  // In this example, we check if the incoming path is a custom URL scheme
  const isUrlLike = args.path.includes('://') || args.path.startsWith('//');
  if (isUrlLike) {
    try {
      const url = new URL(args.path, `${applicationName}://app`);
      const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';

      if (!isWebUrl && url.hostname === 'app') {
        const encodedOriginalPath = encodeURIComponent(args.path);
        return `/third-party?raw=${encodedOriginalPath}`;
      }
    } catch {
      // Keep original path if parsing fails.
    }
  }

  return args.path;
}
