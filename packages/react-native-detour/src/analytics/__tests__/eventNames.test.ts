import { eventNameProblem } from "../const/eventNames";
import { DetourEventNames } from "../types";

describe("eventNameProblem", () => {
  it("accepts every standard name", () => {
    for (const name of Object.values(DetourEventNames)) {
      expect(eventNameProblem(name)).toBeNull();
    }
  });

  it.each(["level_complete", "a", "x".repeat(64), "step_2", "app_open"])(
    "accepts the custom name %p",
    (name) => {
      expect(eventNameProblem(name)).toBeNull();
    },
  );

  it.each(["", "Level", "level-complete", "level complete", "x".repeat(65), "zażółć"])(
    "refuses %p, which breaks the pattern",
    (name) => {
      expect(eventNameProblem(name)).toMatch(/must match/);
    },
  );

  it.each(["af_install", "dt_click"])("refuses the reserved prefix in %p", (name) => {
    expect(eventNameProblem(name)).toMatch(/prefixes are reserved/);
  });

  it("refuses opened_via_universal_link", () => {
    expect(eventNameProblem("opened_via_universal_link")).toMatch(/reserved for Detour/);
  });

  it("refuses non-strings", () => {
    expect(eventNameProblem(undefined)).toMatch(/must match/);
    expect(eventNameProblem(42)).toMatch(/must match/);
  });
});
