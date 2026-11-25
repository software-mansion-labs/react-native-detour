const warned = new Set<string>();

/** Warns in development builds only, once per launch for each `key`. */
export const warnOnceInDev = (key: string, message: string) => {
  if (!__DEV__ || warned.has(key)) return;
  warned.add(key);
  console.warn(`🔗[Detour:CONSENT] ${message}`);
};
