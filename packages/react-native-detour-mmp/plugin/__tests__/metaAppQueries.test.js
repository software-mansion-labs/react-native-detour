const { addMetaAppQueries } = require("../metaAppQueries");

const packageNames = (manifest) =>
  manifest.manifest.queries.flatMap((query) =>
    (query.package ?? []).map((item) => item.$["android:name"]),
  );

describe("addMetaAppQueries", () => {
  it("adds the Meta apps to a manifest without <queries>", () => {
    const manifest = addMetaAppQueries({ manifest: { $: { package: "com.example" } } });

    expect(manifest.manifest.$).toEqual({ package: "com.example" });
    expect(packageNames(manifest)).toEqual([
      "com.facebook.katana",
      "com.instagram.android",
      "com.facebook.lite",
    ]);
  });

  it("keeps the app's own queries and adds only the missing Meta apps", () => {
    const intent = { action: [{ $: { "android:name": "android.intent.action.VIEW" } }] };
    const manifest = addMetaAppQueries({
      manifest: {
        queries: [
          {
            package: [
              { $: { "android:name": "com.example.other" } },
              { $: { "android:name": "com.instagram.android" } },
            ],
            intent: [intent],
          },
        ],
      },
    });

    expect(packageNames(manifest)).toEqual([
      "com.example.other",
      "com.instagram.android",
      "com.facebook.katana",
      "com.facebook.lite",
    ]);
    expect(manifest.manifest.queries[0].intent).toEqual([intent]);
  });
});
