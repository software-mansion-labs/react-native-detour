# @swmansion/react-native-detour

### React Native Detour is SDK for handling deferred links in React Native

## Documentation

Check out our dedicated documentation page for info about this library, API reference and more: [https://docs.swmansion.com/detour/docs/](https://docs.swmansion.com/detour/docs/)

## Installation

[https://docs.swmansion.com/detour/docs/SDK/sdk-installation](https://docs.swmansion.com/detour/docs/SDK/sdk-installation)

npm:

```sh
npm install @swmansion/react-native-detour
```

#### You need to install additional dependencies

npm:

```sh
npm install expo-localization react-native-device-info expo-clipboard @react-native-async-storage/async-storage expo-application
```

## Usage

#### Initialize provider in root of your app

```js
import { DetourProvider, type Config } from '@swmansion/react-native-detour';

const config: Config = {
  API_KEY: '<REPLACE_WITH_YOUR_API_KEY>',
  appID: '<REPLACE_WITH_APP_ID_FROM_PLATFORM>',
  shouldUseClipboard: true,
};

export default function RootLayout() {

  return(
    <DetourProvider config={config}>
      <RootNavigator />
    </DetourProvider>)
}
```

#### Example usage with Expo Router

```js
import { useDetourContext } from '@swmansion/react-native-detour';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect, Stack } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export function RootNavigator() {
  const { deferredLinkProcessed, deferredLink, route } = useDetourContext();

  useEffect(() => {
    if (deferredLinkProcessed) {
      SplashScreen.hide();
    }
  }, [deferredLinkProcessed]);

  if (!deferredLinkProcessed) {
    return null;
  }

  if (route) {
    return <Redirect href={route} />;
  }

  return <Stack />;
}
```

## Types

The package exposes several types to help you with type-checking in your own codebase.

**Config**

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
   * When true, it displays permission alert to user.
   * Defaults to true if not provided.
   */
  shouldUseClipboard?: boolean;
};
```

**DeferredLinkContext**

This type represents the object returned by the useDetourContext hook, containing the deferred link and its processing status.

```js
export type DeferredLinkContext = {
  /**
   * Boolean indicating if the deferred link has been processed.
   * This is useful for conditionally rendering UI components.
   */
  deferredLinkProcessed: boolean;

  /**
   * The deferred link value. This can be a string or a URL object, or null if no link was found.
   */
  deferredLink: string | URL | null;

  /**
   * The detected route based on the deferred link, or null if no route was detected.
   */
  route: string | null;
  };
```

---

## :balance_scale: License

This library is licensed under [The MIT License](./LICENSE).

## React Native Detour is created by Software Mansion

Since 2012, [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=react-native-executorch&utm_medium=readme).

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=react-native-executorch-github 'Software Mansion')](https://swmansion.com)
