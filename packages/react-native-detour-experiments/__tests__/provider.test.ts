import React from "react";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { type ReactTestRenderer, act, create } from "react-test-renderer";

import { DetourExperimentsProvider } from "../src/runtime/context";
import { defineExperiment, defineFlag, defineRegistry } from "../src/runtime/declarations";
import { useExperiment, useFeatureFlag } from "../src/runtime/hooks";
import { resetLaunchForTests } from "../src/runtime/launch";
import { resetRemoteConfigCacheForTests } from "../src/runtime/remoteConfigCache";
import { resetRemoteConfigFetchForTests } from "../src/runtime/remoteConfigFetch";
import { resetSessionForTests } from "../src/runtime/session";
import {
  type StorageAdapter,
  resetDeviceIdForTests,
  setDetourModuleForTests,
} from "../src/runtime/storage";
import type { ExperimentEvent } from "../src/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const Promo = defineExperiment({ key: "promo", variants: ["A", "B"] });
const DarkMode = defineFlag({ key: "dark_mode", variants: ["off", "on"], default: "off" });
const registry = defineRegistry([Promo, DarkMode]);

const payload = {
  version: 1,
  updatedAt: "2026-11-10T00:00:00.000Z",
  experiments: {
    promo: {
      status: "running",
      enabled: true,
      rolloutPercent: 100,
      variants: ["A", "B"],
      winner: "B",
    },
  },
  flags: {},
};

type Seen = { variant: string; flag: string; flagSource: string };

function Probe({ seen }: { seen: Seen[] }) {
  const experiment = useExperiment(Promo);
  const flag = useFeatureFlag(DarkMode);
  seen.push({ variant: experiment.variant, flag: flag.variant, flagSource: flag.source });
  return null;
}

// Records every call, so a test can say that nothing was read, written or sent.
function spies() {
  const storageCalls: string[] = [];
  const items = new Map<string, string>();
  const storage: StorageAdapter = {
    getItem: async (key) => {
      storageCalls.push(`get ${key}`);
      return items.get(key) ?? null;
    },
    setItem: async (key, value) => {
      storageCalls.push(`set ${key}`);
      items.set(key, value);
    },
    removeItem: async (key) => {
      storageCalls.push(`remove ${key}`);
      items.delete(key);
    },
  };
  const fetchCalls: string[] = [];
  const fetchSpy = (async (input: unknown) => {
    fetchCalls.push(String(input));
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as unknown as typeof fetch;
  const events: ExperimentEvent[] = [];
  const onLogEvent = (event: ExperimentEvent) => {
    events.push(event);
  };
  return { storage, storageCalls, fetchSpy, fetchCalls, events, onLogEvent };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  }
}

describe("DetourExperimentsProvider with enabled={false}", () => {
  const realFetch = globalThis.fetch;
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    process.env["NODE_ENV"] = "test";
    setDetourModuleForTests(() => null);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = null;
    }
    globalThis.fetch = realFetch;
    resetLaunchForTests();
    resetSessionForTests();
    resetRemoteConfigCacheForTests();
    resetRemoteConfigFetchForTests();
    resetDeviceIdForTests();
  });

  function element(enabled: boolean, s: ReturnType<typeof spies>, seen: Seen[]) {
    return React.createElement(
      DetourExperimentsProvider,
      {
        registry,
        enabled,
        onLogEvent: s.onLogEvent,
        detourConfig: { apiKey: "key", appID: "app", storage: s.storage },
      },
      React.createElement(Probe, { seen }),
    );
  }

  test("returns the defaults and reads, writes and sends nothing", async () => {
    const s = spies();
    globalThis.fetch = s.fetchSpy;
    const seen: Seen[] = [];

    await act(async () => {
      renderer = create(element(false, s, seen));
    });
    await settle();

    assert.ok(seen.length > 0);
    for (const entry of seen) {
      assert.equal(entry.variant, "A");
      assert.equal(entry.flag, "off");
      assert.equal(entry.flagSource, "default");
    }
    assert.deepEqual(s.storageCalls, []);
    assert.deepEqual(s.fetchCalls, []);
    assert.deepEqual(s.events, []);
  });

  test("turning it on starts the SDK, and turning it off again stops it", async () => {
    const s = spies();
    globalThis.fetch = s.fetchSpy;
    const seen: Seen[] = [];

    await act(async () => {
      renderer = create(element(false, s, seen));
    });
    await settle();
    assert.deepEqual(s.fetchCalls, []);

    await act(async () => {
      renderer?.update(element(true, s, seen));
    });
    await settle();
    assert.ok(s.fetchCalls.length > 0, "the remote config is fetched");
    assert.ok(
      s.storageCalls.some((call) => call.startsWith("get ")),
      "the stored state is read",
    );
    assert.equal(seen.at(-1)?.variant, "B", "the session assigns the remote winner");

    s.storageCalls.length = 0;
    s.fetchCalls.length = 0;
    s.events.length = 0;
    await act(async () => {
      renderer?.update(element(false, s, seen));
    });
    await settle();

    assert.equal(seen.at(-1)?.variant, "A");
    assert.equal(seen.at(-1)?.flagSource, "default");
    assert.deepEqual(s.fetchCalls, []);
    assert.deepEqual(s.events, []);
  });
});
