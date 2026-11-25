import { sendEvent } from "../api/events";

const event = { eventName: "level_complete", data: { level: 3 } };
const args = { apiKey: "key", appID: "app", deviceId: "device", event };

function mockResponse(status: number, body?: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error("no body")) : Promise.resolve(body)),
  }) as unknown as typeof fetch;
}

describe("sendEvent", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("sends the event name, data and device id", async () => {
    mockResponse(200, { status: 200 });
    await sendEvent(args);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      event_name: "level_complete",
      data: { level: 3 },
      device_id: "device",
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs the server's message when the name limit refuses the event", async () => {
    mockResponse(400, {
      error: {
        formErrors: [],
        fieldErrors: { event_name: ["the App already has 500 custom event names"] },
      },
    });
    await sendEvent(args);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Event "level_complete" refused: the App already has 500 custom event names.',
      ),
    );
  });

  it.each([
    [413, "the request body is too large"],
    [429, "rate limit exceeded"],
  ])("logs a %i refusal", async (status, message) => {
    mockResponse(status, { error: "x" });
    await sendEvent(args);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  it("falls back to the status code", async () => {
    mockResponse(500);
    await sendEvent(args);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to log event: 500"));
  });
});
