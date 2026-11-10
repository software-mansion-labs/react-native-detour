import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { type RuleKind, bucketVariant, isEnrolled } from "../src/runtime/assignment";
import { getBucket, getEnrollmentBucket, murmurhash3 } from "../src/runtime/murmurhash3";

type BucketVector = {
  name: string;
  kind: RuleKind;
  variants: string[];
  rolloutPercent: number;
  variantWeights: Record<string, number> | null;
  enrolled: string;
  arms: string;
};

// The dashboard repo tests the same file against its own copy of the split.
const vectors = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "bucket-vectors.json"), "utf8"),
) as BucketVector[];

const BUCKET_COUNT = 100;
const deviceIds = Array.from(
  { length: 400 },
  (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
);

describe("murmurhash3", () => {
  test("matches the reference values of MurmurHash3 x86 32-bit", () => {
    assert.equal(murmurhash3("", 0), 0);
    assert.equal(murmurhash3("", 1), 0x514e28b7);
    assert.equal(murmurhash3("hello", 0), 0x248bfa47);
    assert.equal(murmurhash3("The quick brown fox jumps over the lazy dog", 0), 0x2e4ff723);
  });

  test("gives one device the same buckets on every call", () => {
    for (const deviceId of deviceIds.slice(0, 20)) {
      assert.equal(getBucket(deviceId, "promo"), getBucket(deviceId, "promo"));
      assert.equal(getEnrollmentBucket(deviceId, "promo"), getEnrollmentBucket(deviceId, "promo"));
    }
  });

  test("keeps every bucket in 0 to 99 and reaches most of them", () => {
    const seen = new Set<number>();
    for (const deviceId of deviceIds) {
      const bucket = getBucket(deviceId, "promo");
      assert.ok(Number.isInteger(bucket) && bucket >= 0 && bucket < BUCKET_COUNT);
      seen.add(bucket);
    }
    assert.ok(seen.size > 90);
  });
});

describe("bucketVariant", () => {
  for (const vector of vectors) {
    test(`splits the buckets as the dashboard does: ${vector.name}`, () => {
      const rule = {
        variants: vector.variants,
        ...(vector.variantWeights ? { variantWeights: vector.variantWeights } : {}),
      };
      const arms = Array.from({ length: BUCKET_COUNT }, (_, bucket) =>
        bucketVariant(bucket, rule, vector.kind),
      );
      assert.equal(arms.join(""), vector.arms);
    });
  }
});

describe("isEnrolled", () => {
  for (const vector of vectors) {
    test(`enrolls the buckets the dashboard counts: ${vector.name}`, () => {
      assert.equal(vector.enrolled.length, BUCKET_COUNT);
      for (const deviceId of deviceIds) {
        const bucket = getEnrollmentBucket(deviceId, "promo");
        assert.equal(isEnrolled(deviceId, "promo", vector), vector.enrolled[bucket] === "1");
      }
    });
  }

  test("raising the rollout keeps every enrolled device enrolled", () => {
    for (const deviceId of deviceIds) {
      if (isEnrolled(deviceId, "promo", { rolloutPercent: 10 })) {
        assert.ok(isEnrolled(deviceId, "promo", { rolloutPercent: 50 }));
      }
    }
  });
});
