// Necessary for Fast Refresh on Web
import { registerRootComponent } from "expo";

import "@expo/metro-runtime";

import { App } from "./src/App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
