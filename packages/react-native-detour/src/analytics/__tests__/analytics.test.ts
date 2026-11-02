import { logEvent } from "../analytics";
import { DetourEventNames } from "../types";
import { analyticsEmitter } from "../utils/analyticsEmitter";

describe("logEvent", () => {
  const listener = jest.fn();
  let unsubscribe: () => void;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    listener.mockClear();
    unsubscribe = analyticsEmitter.subscribe(listener);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    unsubscribe();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("emits a standard name", () => {
    logEvent(DetourEventNames.Purchase, { value: 9.99 });
    expect(listener).toHaveBeenCalledWith({ eventName: "purchase", data: { value: 9.99 } });
  });

  it("emits a custom name with its data", () => {
    logEvent("level_complete", { level: 3 });
    expect(listener).toHaveBeenCalledWith({ eventName: "level_complete", data: { level: 3 } });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(["Level-Complete", "af_install", "opened_via_universal_link"])(
    "drops %p and logs an error",
    (name) => {
      logEvent(name);
      expect(listener).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`Event "${name}" dropped`));
    },
  );

  it("warns about data over 2,048 bytes and still emits", () => {
    logEvent("big_event", { text: "x".repeat(3000) });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("2048 bytes"));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
