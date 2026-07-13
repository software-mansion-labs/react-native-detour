import * as Application from "expo-application";

// Marketing version + build number of the host app — analytics-only context
// Both are synchronous and static for the app's lifetime, no caching needed.
export const getAppVersion = (): string | undefined =>
  Application.nativeApplicationVersion ?? undefined;

export const getBuildNumber = (): string | undefined => Application.nativeBuildVersion ?? undefined;
