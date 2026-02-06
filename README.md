<img src="https://github.com/user-attachments/assets/c965b51b-7307-477a-8d22-9c9cd6da6231" alt="React Native Detour by Software Mansion" width="100%"/>

# React Native Detour

SDK for handling deferred links in React Native.

## Create an account

You need a Detour account to generate app credentials and configure your links.
Sign up here: [https://godetour.dev/auth/signup](https://godetour.dev/auth/signup)

## Quick links

- Documentation: [https://docs.swmansion.com/detour/docs/](https://docs.swmansion.com/detour/docs/)
- Installation guide: [https://docs.swmansion.com/detour/docs/SDK/sdk-installation](https://docs.swmansion.com/detour/docs/SDK/sdk-installation)

## Installation

### Package

Install the SDK:

```sh
npm install @swmansion/react-native-detour
```

### Additional dependencies

Install required peer dependencies:

```sh
npm install expo-localization react-native-device-info expo-clipboard @react-native-async-storage/async-storage expo-application
```

> You can override the default persistent storage (@react-native-async-storage/async-storage) by providing an alternative storage implementation. Pass your custom storage object via the configuration settings.

## Usage

### Initialize the provider

```js
import { DetourProvider, type Config } from '@swmansion/react-native-detour';

const config: Config = {
  API_KEY: '<REPLACE_WITH_YOUR_API_KEY>',
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
import { Redirect, Stack } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export function RootNavigator() {
  const { isLinkProcessed, linkRoute, clearLink } = useDetourContext();

  useEffect(() => {
    if (isLinkProcessed) {
      SplashScreen.hide();
    }
  }, [isLinkProcessed]);

  if (!isLinkProcessed) {
    return null;
  }

  if (linkRoute) {
    clearLink(); // avoid redirecting again when returning to this screen
    return <Redirect href={linkRoute} />;
  }

  return <Stack />;
}
```

Learn more about usage from our [docs](https://docs.swmansion.com/detour/docs/SDK/sdk-usage)

## Clearing handled links

If your app redirects based on `linkRoute` (especially in entry screens), call `clearLink()` after handling the route. This prevents repeated redirects when the user returns to the same screen.

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
  API_KEY: string;

  /**
   * Optional: A flag to determine if the provider should check the clipboard for a deferred link.
   * Note: This feature is iOS-only. On Android, clipboard is never accessed regardless of this setting.
   * When enabled on iOS, it may display a permission alert to the user.
   * Defaults to true if not provided.
   */
  shouldUseClipboard?: boolean;

  /**
   * Optional: A custom storage adapter. Defaults to AsyncStorage if not provided.
   */
  storage?: DetourStorage;
};
```

### DetourContextType

This type represents the object returned by the useDetourContext hook, containing the deferred link and its processing status.

```js
export type DetourContextType = {
  /**
   * Boolean indicating if the deferred link, Universal/App Link or scheme deep link has been processed.
   * This is useful for conditionally rendering UI components.
   */
  isLinkProcessed: boolean;

  /**
   * The deferred link, Universal/App Link or scheme deep link url. This can be a string or a URL object, or null if no link was found.
   */
  linkUrl: string | URL | null;

  /**
   * The detected route based on the link url, or null if no route was detected.
   */
  linkRoute: string | null;

  /**
   * The type of the detected link. Can be 'deferred', 'verified' or 'scheme'. This can be null if no link was found.
   */
  linkType: LinkType | null;

  /**
   * Clears the current link context (route/url/type). Call this after you handle a link.
   */
  clearLink: () => void;
  };
```

---

## License

This library is licensed under [The MIT License](./LICENSE).

## React Native Detour is created by Software Mansion

Since 2012, [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=detour&utm_medium=readme).

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=react-native-executorch-github 'Software Mansion')](https://swmansion.com)
