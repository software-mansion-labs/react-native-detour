<img src="https://github.com/user-attachments/assets/c965b51b-7307-477a-8d22-9c9cd6da6231" alt="React Native Detour by Software Mansion" width="100%"/>

# React Native Detour

SDK for handling deferred links in React Native.

## Create an account

You need a Detour account to generate app credentials and configure your links.  
Sign up here: [https://godetour.dev/auth/signup](https://godetour.dev/auth/signup)

## Quick links

- Documentation: [https://docs.swmansion.com/detour/docs/](https://docs.swmansion.com/detour/docs/)
- Installation guide: [https://docs.swmansion.com/detour/docs/SDK/sdk-installation](https://docs.swmansion.com/detour/docs/SDK/sdk-installation)

## Other Detour SDKs

Detour is also available for other app stacks:

- Android SDK: [https://github.com/software-mansion-labs/android-detour](https://github.com/software-mansion-labs/android-detour)
- iOS SDK: [https://github.com/software-mansion-labs/ios-detour](https://github.com/software-mansion-labs/ios-detour)
- Flutter SDK: [https://github.com/software-mansion-labs/detour-flutter-plugin](https://github.com/software-mansion-labs/detour-flutter-plugin)

## Installation

### Package

Install the SDK:

```sh
npm install @swmansion/react-native-detour
```

### Additional dependencies

Install required peer dependencies:

```sh
npm install expo-localization expo-clipboard expo-constants expo-device @react-native-async-storage/async-storage expo-application
```

> You can override the default persistent storage (@react-native-async-storage/async-storage) by providing an alternative storage implementation. Pass your custom storage object via the configuration settings.

## Usage

### Initialize the provider

```js
import { DetourProvider, type Config } from '@swmansion/react-native-detour';

const config: Config = {
  apiKey: '<REPLACE_WITH_YOUR_API_KEY>',
  appID: '<REPLACE_WITH_APP_ID_FROM_PLATFORM>',
  shouldUseClipboard: true,
};

export default function RootLayout() {
  return (
    <DetourProvider config={config}>
      <RootNavigator />
    </DetourProvider>
  );
}
```

### Example (Expo Router)

```js
import { useDetourContext } from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, usePathname, useRouter } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export function RootNavigator() {
  const { isLinkProcessed, link, clearLink } = useDetourContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hide();
    }
  }, [isLinkProcessed]);

  useEffect(() => {
    if (!isLinkProcessed || !link) return;
    if (pathname !== link.pathname) {
      router.replace({ pathname: link.pathname, params: link.params });
      return;
    }
    clearLink(); // avoid redirecting again when returning to this screen
  }, [clearLink, isLinkProcessed, link, pathname, router]);

  if (!isLinkProcessed) {
    return null;
  }

  return <Stack />;
}
```

Learn more about usage from our [docs](https://docs.swmansion.com/detour/docs/SDK/sdk-usage)

### Controlling which links Detour processes

Use `linkProcessingMode` to control which link sources the SDK listens to:

|Value|Universal/App links|Deferred links|Custom scheme links|
|---|---|---|---|
|`'all'` (default)|✅|✅|✅|
|`'web-only'`|✅|✅|❌|
|`'deferred-only'`|❌|✅|❌|

```js
const config: Config = {
  apiKey: '<REPLACE_WITH_YOUR_API_KEY>',
  appID: '<REPLACE_WITH_APP_ID_FROM_PLATFORM>',
  // Process Universal/App links and deferred links, but let your own
  // navigation layer handle custom scheme links (e.g. myapp://...).
  linkProcessingMode: 'web-only',
};
```

Use `'deferred-only'` when Expo Router's `+native-intent.tsx` handler is already resolving runtime Universal/App links — this prevents double-processing.

## Examples

All example apps with Detour SDK integrated live in `examples/`:

- `examples/expo-bare`
- `examples/expo-router`
- `examples/expo-router-native-intent`
- `examples/expo-router-advanced`
- `examples/react-navigation`
- `examples/react-navigation-advanced`

You can run them from repo root:

```sh
yarn examples:expo-bare start
yarn examples:expo-router start
yarn examples:expo-router-native-intent start
yarn examples:expo-router-advanced start
yarn examples:react-navigation start
yarn examples:react-navigation-advanced start
```

If you want to know more details about a given example and how to configure it, please read the README in the appropriate example directory.

## Clearing handled links

If your app redirects based on `link` (especially in entry screens), call `clearLink()` after handling the route. This prevents repeated redirects when the user returns to the same screen.

## Types

The package exposes several types to help you with type-checking in your own codebase.

### Config

This type is used to define the configuration object you pass to the DetourProvider.

```js
export type Config = {
  /**
   * Your application ID from the Detour dashboard.
   */
  appID: string;

  /**
   * Your API key from the Detour dashboard.
   */
  apiKey: string;

  /**
   * Optional: A flag to determine if the provider should check the clipboard for a deferred link.
   * Note: This feature is iOS-only. On Android, clipboard is never accessed regardless of this setting.
   * When enabled on iOS, it may display a permission alert to the user.
   * Defaults to true if not provided.
   */
  shouldUseClipboard?: boolean;

  /**
   * Optional: Controls which link sources are handled by the SDK.
   * - 'all': deferred links + Universal/App links + custom scheme links (default)
   * - 'web-only': deferred links + Universal/App links, but NOT custom scheme links
   * - 'deferred-only': only deferred links (use when native-intent already handles runtime links)
   * Defaults to 'all'.
   */
  linkProcessingMode?: 'all' | 'web-only' | 'deferred-only';

  /**
   * Optional: A custom storage adapter. Defaults to AsyncStorage if not provided.
   */
  storage?: DetourStorage;
};
```

### DetourContextType

This type represents the object returned by the `useDetourContext` hook, containing the resolved link and its processing status.

```js
export type DetourContextType = {
  /**
   * Boolean indicating if the initial link (deferred, Universal/App Link, or scheme) has been processed.
   * Use this to gate navigation or hide the splash screen.
   */
  isLinkProcessed: boolean;

  /**
   * The resolved link object, or null if no link was found.
   */
  link: DetourLink;

  /**
   * Resets the link to null. Call this after you handle a link.
   */
  clearLink: () => void;
};
```

### DetourLink

The resolved link object, or null if no link was found.

```js
export type DetourLink = {
  /** The original link URL as received by the SDK. */
  url: string | URL;

  /** Full route path including query string (e.g. '/details/42?campaign=summer'). */
  route: string;

  /** Route path without query string (e.g. '/details/42'). */
  pathname: string;

  /** Parsed query parameters (e.g. { campaign: 'summer' }). */
  params: Record<string, string>;

  /**
   * The type of the detected link:
   * - 'deferred': resolved from the Detour API on first app install
   * - 'verified': Universal Link (iOS) or App Link (Android)
   * - 'scheme': custom scheme deep link (only when linkProcessingMode is 'all')
   */
  type: LinkType;
} | null;
```

---

## License

This library is licensed under [The MIT License](./LICENSE).

## React Native Detour is created by Software Mansion

Since 2012, [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=detour&utm_medium=readme).

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=react-native-executorch-github 'Software Mansion')](https://swmansion.com)
