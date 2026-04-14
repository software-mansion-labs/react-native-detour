export const APP_SCHEME_PREFIX = "detour-react-navigation-advanced://";

export const isAppSchemeUrl = (url: string) => url.toLowerCase().startsWith(APP_SCHEME_PREFIX);
