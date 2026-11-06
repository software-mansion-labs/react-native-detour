// The core SDK requires this file to tell whether the app installed this package; only then do its
// requests report `X-SDK-Package: mmp`. It must not import the core SDK, or the two would load
// each other in a loop. It sits at the package root, without a build step, so Metro finds it also
// without package exports (React Native before 0.79).
module.exports = { isDetourAttributionPackage: true };
