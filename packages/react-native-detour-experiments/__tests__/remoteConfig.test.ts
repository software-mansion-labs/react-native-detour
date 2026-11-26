import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseRemoteConfigPayload } from "../src/remoteConfig";

const rule = {
  status: "running",
  enabled: true,
  rolloutPercent: 50,
  variants: ["A", "B"],
  winner: null,
};

describe("parseRemoteConfigPayload", () => {
  test("keeps a well-formed payload as it is", () => {
    const payload = {
      version: 3,
      updatedAt: "2026-11-10T00:00:00.000Z",
      experiments: { promo: rule },
      flags: { darkMode: { ...rule, variantWeights: { A: 0, B: 1 } } },
    };
    assert.deepEqual(parseRemoteConfigPayload(payload), payload);
  });

  test("leaves out a rule it cannot read and keeps the others", () => {
    const parsed = parseRemoteConfigPayload({
      version: 4,
      updatedAt: "2026-11-10T00:00:00.000Z",
      experiments: {
        promo: rule,
        noVariants: { ...rule, variants: [] },
        noWinnerField: { status: "running", enabled: true, rolloutPercent: 50, variants: ["A"] },
        notAnObject: "running",
      },
      flags: { darkMode: rule, badRollout: { ...rule, rolloutPercent: "50" } },
    });
    assert.deepEqual(Object.keys(parsed?.experiments ?? {}), ["promo"]);
    assert.deepEqual(Object.keys(parsed?.flags ?? {}), ["darkMode"]);
    assert.equal(parsed?.version, 4);
  });

  test("rejects a payload with no version or no rule maps", () => {
    assert.equal(parseRemoteConfigPayload(null), null);
    assert.equal(parseRemoteConfigPayload([]), null);
    assert.equal(parseRemoteConfigPayload({ experiments: {}, flags: {} }), null);
    assert.equal(parseRemoteConfigPayload({ version: 1, experiments: {} }), null);
    assert.equal(parseRemoteConfigPayload({ version: 1, experiments: [], flags: {} }), null);
  });
});
