// The Facebook, Instagram and Facebook Lite apps hold the Meta Install Referrer. From Android 11
// the app sees them only when its manifest lists them in <queries>.
const META_APP_PACKAGES = ["com.facebook.katana", "com.instagram.android", "com.facebook.lite"];

/**
 * Adds the Meta apps the manifest does not list in <queries> yet.
 * @returns the manifest in the shape `withAndroidManifest` gives it
 */
const addMetaAppQueries = (androidManifest) => {
  const queries = androidManifest.manifest.queries ?? [];
  const listed = new Set(
    queries.flatMap((query) => (query.package ?? []).map((item) => item.$?.["android:name"])),
  );
  const missing = META_APP_PACKAGES.filter((name) => !listed.has(name));
  if (missing.length === 0) return androidManifest;

  const [first = {}, ...rest] = queries;
  const packages = [
    ...(first.package ?? []),
    ...missing.map((name) => ({ $: { "android:name": name } })),
  ];
  return {
    ...androidManifest,
    manifest: { ...androidManifest.manifest, queries: [{ ...first, package: packages }, ...rest] },
  };
};

module.exports = { addMetaAppQueries };
