import assert from "node:assert/strict";
import { describe, test } from "node:test";

// The Detour SDK's rule, read from its source, so a change there fails this test until mirrored.
import { eventNameProblem as detourEventNameProblem } from "../../react-native-detour/src/analytics/const/eventNames";
import { createEventSink } from "../src/runtime/createEventSink";
import { eventNameProblem } from "../src/runtime/eventNames";
import type { ExperimentOutcomeEvent } from "../src/types";

const NAMES: unknown[] = [
  "level_complete",
  "a",
  "x".repeat(64),
  "step_2",
  "app_open",
  "",
  "Level",
  "level-complete",
  "level complete",
  "x".repeat(65),
  "zażółć",
  "af_install",
  "dt_click",
  "af_",
  "opened_via_universal_link",
  undefined,
  42,
];

describe("eventNameProblem", () => {
  test("refuses the same names as the Detour SDK, with the same reason", () => {
    for (const name of NAMES) {
      assert.equal(eventNameProblem(name), detourEventNameProblem(name), String(name));
    }
  });

  test("accepts a plain name", () => {
    assert.equal(eventNameProblem("purchase"), null);
  });

  for (const name of ["af_install", "dt_click", "opened_via_universal_link"]) {
    test(`refuses the reserved ${name}`, () => {
      assert.match(eventNameProblem(name) ?? "", /reserved/);
    });
  }
});

describe("outcome names in the event sink", () => {
  function outcome(metric: string): ExperimentOutcomeEvent {
    return {
      type: "outcome",
      experimentKey: "promo",
      variant: "A",
      source: "remote",
      timestamp: Date.now(),
      metric,
      isDev: false,
    };
  }

  function sinkWithoutNetwork() {
    const calls: unknown[] = [];
    const fetchImpl = (async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const sink = createEventSink({ apiKey: "key", appId: "app", platform: "ios", fetchImpl });
    return { sink, calls };
  }

  for (const metric of ["af_purchase", "dt_purchase", "opened_via_universal_link", "Purchase"]) {
    test(`drops ${metric} before it is queued`, async () => {
      const { sink, calls } = sinkWithoutNetwork();
      sink(outcome(metric));
      assert.equal(sink.pendingCount(), 0);
      await sink.flush();
      assert.equal(calls.length, 0);
      sink.stop();
    });
  }

  test("queues a valid metric", () => {
    const { sink } = sinkWithoutNetwork();
    sink(outcome("purchase"));
    assert.equal(sink.pendingCount(), 1);
    sink.stop();
  });
});
