import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  applyRemoteConfigPayload,
  readCachedRemoteConfig,
  resetRemoteConfigCacheForTests,
} from "../src/runtime/remoteConfigCache";
import {
  refreshRemoteConfig,
  resetRemoteConfigFetchForTests,
} from "../src/runtime/remoteConfigFetch";

const payload = {
  version: 2,
  updatedAt: "2026-11-10T00:00:00.000Z",
  experiments: {
    promo: {
      status: "running",
      enabled: true,
      rolloutPercent: 100,
      variants: ["A", "B"],
      winner: null,
    },
  },
  flags: {},
};

const answer = (status: number) =>
  (async () => new Response(JSON.stringify({}), { status })) as unknown as typeof fetch;

describe("refreshRemoteConfig", () => {
  afterEach(() => {
    resetRemoteConfigCacheForTests();
    resetRemoteConfigFetchForTests();
  });

  for (const status of [401, 403, 404]) {
    test(`a ${status} drops the cached config`, async () => {
      applyRemoteConfigPayload(payload as never);
      const result = await refreshRemoteConfig({ fetchImpl: answer(status) });

      assert.equal(result.changed, true);
      assert.equal(readCachedRemoteConfig(), null);
    });
  }

  test("a 500 keeps the cached config", async () => {
    applyRemoteConfigPayload(payload as never);
    const result = await refreshRemoteConfig({ fetchImpl: answer(500) });

    assert.equal(result.changed, false);
    assert.equal(readCachedRemoteConfig()?.version, 2);
  });
});
