import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import type { RemoteConfigPayload, RemoteRule } from "../src/remoteConfig";
import { type ResolvedAssignment, resolveAssignment } from "../src/runtime/assignment";
import { resetDevWarningsForTests } from "../src/runtime/environment";
import { resolveFlag } from "../src/runtime/resolveFlag";

const KEY = "promo";
const DEVICE_ID = "00000000-0000-4000-8000-000000000001";
const DECLARED = ["A", "B", "C", "D"] as const;

// What each rule of the order reads. A case turns on its own rule and every rule after it, so
// it passes only while its own rule is checked first: swapping two rules fails a case.
type Rules = {
  forced?: string;
  override?: string;
  winner?: string;
  paused?: boolean;
  outsideAudience?: boolean;
  noDeviceId?: boolean;
  notEnrolled?: boolean;
  // Every enrolled device lands here, so the case does not depend on the hash.
  bucket?: string;
};

type Case = {
  name: string;
  rules: Rules;
  experiment: ResolvedAssignment;
  flag: ResolvedAssignment;
};

const EVERY_LATER_RULE: Rules = {
  override: "C",
  winner: "D",
  paused: true,
  outsideAudience: true,
  noDeviceId: true,
  notEnrolled: true,
  bucket: "C",
};

function from(first: keyof Rules): Rules {
  const names = Object.keys(EVERY_LATER_RULE) as (keyof Rules)[];
  const later = names.slice(names.indexOf(first));
  return Object.fromEntries(later.map((name) => [name, EVERY_LATER_RULE[name]]));
}

// The flag's default is B, so "no device id" (the default) differs from a held flag (A).
const FLAG_DEFAULT = "B";

const cases: Case[] = [
  {
    name: "forced variant",
    rules: { forced: "B", ...EVERY_LATER_RULE },
    experiment: { variant: "B", source: "devOverride" },
    flag: { variant: "B", source: "devOverride" },
  },
  {
    name: "a forced variant the build does not declare is skipped",
    rules: { forced: "E", ...EVERY_LATER_RULE },
    experiment: { variant: "C", source: "devOverride" },
    flag: { variant: "C", source: "devOverride" },
  },
  {
    name: "override",
    rules: from("override"),
    experiment: { variant: "C", source: "devOverride" },
    flag: { variant: "C", source: "devOverride" },
  },
  {
    name: "winner",
    rules: from("winner"),
    experiment: { variant: "D", source: "remoteWinner" },
    flag: { variant: "D", source: "remoteWinner" },
  },
  {
    name: "paused",
    rules: from("paused"),
    experiment: { variant: "A", source: "paused" },
    flag: { variant: "A", source: "paused" },
  },
  {
    name: "outside the audience",
    rules: from("outsideAudience"),
    experiment: { variant: "A", source: "untargeted" },
    flag: { variant: "A", source: "untargeted" },
  },
  {
    name: "no device id",
    rules: from("noDeviceId"),
    experiment: { variant: "A", source: "default" },
    flag: { variant: FLAG_DEFAULT, source: "default" },
  },
  {
    name: "outside the rollout",
    rules: from("notEnrolled"),
    experiment: { variant: "A", source: "notEnrolled" },
    flag: { variant: "A", source: "notEnrolled" },
  },
  {
    name: "bucket",
    rules: from("bucket"),
    experiment: { variant: "C", source: "remote" },
    flag: { variant: "C", source: "remote" },
  },
  {
    name: "a bucket the build does not declare is held",
    rules: { bucket: "E" },
    experiment: { variant: "A", source: "undeclared" },
    flag: { variant: "A", source: "undeclared" },
  },
  {
    name: "a winner the build does not declare is held",
    rules: { ...from("winner"), winner: "E" },
    experiment: { variant: "A", source: "undeclared" },
    flag: { variant: "A", source: "undeclared" },
  },
];

function remoteRule(rules: Rules): RemoteRule {
  const variants = [...DECLARED, "E"];
  return {
    status: "running",
    enabled: !rules.paused,
    rolloutPercent: rules.notEnrolled ? 0 : 100,
    variants,
    variantWeights: Object.fromEntries(
      variants.map((variant) => [variant, variant === rules.bucket ? 1 : 0]),
    ),
    winner: rules.winner ?? null,
    ...(rules.outsideAudience
      ? { audience: [{ attribute: "platform", operator: "is", values: ["android"] }] }
      : {}),
  };
}

function options(rules: Rules, kind: "experiments" | "flags") {
  const remoteConfig: RemoteConfigPayload = {
    version: 1,
    updatedAt: "2026-11-17T00:00:00.000Z",
    experiments: {},
    flags: {},
  };
  remoteConfig[kind][KEY] = remoteRule(rules);
  return {
    deviceId: rules.noDeviceId ? null : DEVICE_ID,
    variants: DECLARED,
    overrides: rules.override ? { [KEY]: rules.override } : {},
    forcedVariants: rules.forced ? { [KEY]: rules.forced } : {},
    remoteConfig,
    attributes: { platform: "ios" as const },
  };
}

afterEach(() => {
  resetDevWarningsForTests();
});

describe("resolveAssignment: the order of the rules", () => {
  for (const { name, rules, experiment } of cases) {
    test(name, () => {
      const resolved = resolveAssignment({ ...options(rules, "experiments"), experimentKey: KEY });
      assert.deepEqual(resolved, experiment);
    });
  }

  test("an override the build does not declare is held", () => {
    const resolved = resolveAssignment({
      ...options({ ...EVERY_LATER_RULE, override: "E" }, "experiments"),
      experimentKey: KEY,
    });
    assert.deepEqual(resolved, { variant: "A", source: "undeclared" });
  });

  test("no remote rule", () => {
    const resolved = resolveAssignment({
      deviceId: DEVICE_ID,
      experimentKey: KEY,
      variants: DECLARED,
    });
    assert.deepEqual(resolved, { variant: "A", source: "default" });
  });
});

describe("resolveFlag: the order of the rules", () => {
  for (const { name, rules, flag } of cases) {
    test(name, () => {
      const { variant, source, enabled } = resolveFlag({
        ...options(rules, "flags"),
        flagKey: KEY,
        defaultVariant: FLAG_DEFAULT,
      });
      assert.deepEqual({ variant, source }, flag);
      assert.equal(enabled, flag.variant !== "A");
    });
  }

  test("an override the build does not declare is skipped", () => {
    const { variant, source } = resolveFlag({
      ...options({ ...EVERY_LATER_RULE, override: "E" }, "flags"),
      flagKey: KEY,
      defaultVariant: FLAG_DEFAULT,
    });
    assert.deepEqual({ variant, source }, { variant: "D", source: "remoteWinner" });
  });

  test("no remote rule", () => {
    const { variant, source } = resolveFlag({
      deviceId: DEVICE_ID,
      flagKey: KEY,
      variants: DECLARED,
      defaultVariant: FLAG_DEFAULT,
    });
    assert.deepEqual({ variant, source }, { variant: FLAG_DEFAULT, source: "default" });
  });
});
