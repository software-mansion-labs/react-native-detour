import { buildAnalyticsBody } from "../../api/send";
import { BACKGROUND_TIMEOUT_MS, type SessionEvent, SessionManager } from "../sessionManager";

jest.mock("expo-application", () => ({}));
jest.mock("../../../net/requestContext", () => ({
  getRequestContext: async () => ({ app_version: "4.2.0" }),
}));

describe("SessionManager", () => {
  let clock: number;
  let events: SessionEvent[];
  let manager: SessionManager;

  const startedId = () => events[0]!.sessionId;

  beforeEach(() => {
    clock = 1_730_000_000_000;
    events = [];
    manager = new SessionManager(() => clock);
    manager.start((event) => events.push(event));
    manager.onForeground();
  });

  it("starts a session on the first foreground", () => {
    expect(events).toEqual([{ type: "start", sessionId: startedId(), at: clock }]);
  });

  it("reports the end with its duration on every trip to the background", () => {
    clock += 600_000;
    manager.onBackground();

    expect(events.at(-1)).toEqual({
      type: "end",
      sessionId: startedId(),
      at: clock,
      durationMs: 600_000,
    });
    expect(manager.currentSessionId).toBe(startedId());
  });

  it("keeps the session after a short trip to the background", () => {
    manager.onBackground();
    clock += BACKGROUND_TIMEOUT_MS;
    manager.onForeground();

    expect(events).toHaveLength(2);
    expect(manager.currentSessionId).toBe(startedId());
  });

  it("starts a new session after a long trip to the background", () => {
    manager.onBackground();
    clock += BACKGROUND_TIMEOUT_MS + 1;
    manager.onForeground();

    const newStart = events.at(-1)!;
    expect(newStart.type).toBe("start");
    expect(newStart.sessionId).not.toBe(startedId());
    expect(manager.currentSessionId).toBe(newStart.sessionId);
  });
});

describe("session body", () => {
  it("follows the contract", async () => {
    const body = await buildAnalyticsBody(
      {
        kind: "session",
        event: {
          type: "end",
          sessionId: "8c1d2e3f-4a5b-4c6d-8e7f-901a2b3c4d5e",
          at: 1_730_000_000_000,
          durationMs: 1_235,
        },
      },
      "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01",
      "u_12345",
    );

    expect(body).toEqual({
      app_version: "4.2.0",
      type: "end",
      session_id: "8c1d2e3f-4a5b-4c6d-8e7f-901a2b3c4d5e",
      timestamp: "2024-10-27T03:33:20.000Z",
      duration_ms: 1_235,
      device_id: "3f2b8c1e-9d4a-4c55-8f0e-2a6b7c8d9e01",
      user_id: "u_12345",
    });
  });
});
