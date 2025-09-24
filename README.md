# @swmansion/react-native-detour

sdk for handling deferred links

## Installation

```sh
npm install @swmansion/react-native-detour
```

#### You need to install additional dependencies

```sh
npm install expo-localization react-native-device-info expo-clipboard @react-native-async-storage/async-storage expo-application
```

## Usage

#### Initialize provider in root of your app

```js
import { DetourProvider, type Config } from '@swmansion/react-native-detour';

export default function App() {
  const config: Config = {
    API_KEY: 'ssss-ssss-ssss',
    appID: 'app-id-from-dashboard',
    shouldUseClipboard: true,
  };

  return(
    <DetourProvider config={config}>
    // rest of app content
    </DetourProvider>)
}
```

#### Use values from context

```js
import { useDetourContext } from '@swmansion/react-native-detour';

// inside component
const { deferredLink, deferredLinkProcessed, route } = useDetourContext();
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

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
