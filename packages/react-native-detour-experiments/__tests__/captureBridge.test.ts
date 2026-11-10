import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseForcedVariants } from "../src/runtime/captureBridge";

describe("parseForcedVariants", () => {
  test("reads every forced variant of the link", () => {
    assert.deepEqual(
      parseForcedVariants(
        "myapp://home?detour_experiments_force=promo%3AB&detour_experiments_force=darkMode:A",
      ),
      { promo: "B", darkMode: "A" },
    );
  });

  test("ignores a value that is not one capital letter", () => {
    assert.deepEqual(parseForcedVariants("myapp://home?detour_experiments_force=promo:b"), {});
    assert.deepEqual(parseForcedVariants("myapp://home?detour_experiments_force=promo:AB"), {});
    assert.deepEqual(parseForcedVariants("myapp://home?detour_experiments_force=promo"), {});
  });

  test("a link with a malformed escape does not throw", () => {
    assert.deepEqual(parseForcedVariants("myapp://home?foo=%E0%A4%A&bar=1"), {});
    assert.deepEqual(parseForcedVariants("myapp://home?%E0%A4%A=1"), {});
    assert.deepEqual(
      parseForcedVariants(
        "myapp://home?detour_experiments_force=%E0%A4%A&detour_experiments_force=promo:B",
      ),
      { promo: "B" },
    );
  });
});
