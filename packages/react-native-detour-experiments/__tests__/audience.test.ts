import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { compareVersions, matchesAudience } from "../src/runtime/audience";
import type { DeviceAttributes } from "../src/runtime/deviceAttributes";

type AudienceVector = {
  name: string;
  audience: unknown;
  attributes: DeviceAttributes;
  matches: boolean;
};

// The dashboard repo tests the same file against its own `matchesAudience`.
const vectors = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "audience-vectors.json"), "utf8"),
) as AudienceVector[];

describe("matchesAudience", () => {
  for (const vector of vectors) {
    test(vector.name, () => {
      assert.equal(matchesAudience(vector.audience, vector.attributes), vector.matches);
    });
  }

  test("an audience that is not a list matches no device", () => {
    assert.equal(matchesAudience({ attribute: "platform" }, { platform: "ios" }), false);
    assert.equal(matchesAudience("everyone", { platform: "ios" }), false);
  });

  test("a condition with an unknown shape matches no device", () => {
    assert.equal(
      matchesAudience([{ attribute: "platform", is: "ios" }], { platform: "ios" }),
      false,
    );
  });
});

describe("compareVersions", () => {
  test("a missing part is 0", () => {
    assert.equal(compareVersions("2.3", "2.3.0"), 0);
    assert.equal(compareVersions("2", "2.0.1"), -1);
  });

  test("parts compare as numbers, not as text", () => {
    assert.equal(compareVersions("2.10", "2.9"), 1);
  });

  test("a version with a non-numeric part cannot be compared", () => {
    assert.equal(compareVersions("2.3-beta", "2.3"), null);
  });
});
