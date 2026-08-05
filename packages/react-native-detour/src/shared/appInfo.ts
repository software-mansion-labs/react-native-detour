import * as Application from "expo-application";

export const getAppVersion = (): string | undefined =>
  Application.nativeApplicationVersion ?? undefined;

export const getBuildNumber = (): string | undefined => Application.nativeBuildVersion ?? undefined;
