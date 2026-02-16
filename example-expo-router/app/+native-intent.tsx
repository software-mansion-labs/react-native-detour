import {
  createDetourNativeIntentHandler,
  type NativeIntentArgs,
} from '@swmansion/react-native-detour';

const detourHandler = createDetourNativeIntentHandler({
  fallbackPath: '',
});

export async function redirectSystemPath(args: NativeIntentArgs) {
  const detourResult = await detourHandler(args);
  if (detourResult !== args.path) {
    console.log(
      `[LOG][redirectSystemPath] Detour handled path: ${args.path} -> ${detourResult}`
    ); // TODO: Remove debug log
    return detourResult;
  }

  console.log(`[LOG][redirectSystemPath] Custom rewrite: ${args.path}`); // TODO: Remove debug log
  // Your existing third-party/native-intent logic
  const url = new URL(args.path, 'example-expo-router://app');
  console.log(`[LOG][redirectSystemPath] Parsed URL: ${url}`); // TODO: Remove debug log
  console.log(`[LOG][hostname] ${url.hostname}`); // TODO: Remove debug log
  if (url.hostname === 'app') {
    console.log(`[LOG][redirectSystemPath] Third-party URL detected: ${url}`); // TODO: Remove debug log
    return `/third-party${url.pathname}`;
  }
  return args.path;
}
