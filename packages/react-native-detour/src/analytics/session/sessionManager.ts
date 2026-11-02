import { generateUUID } from "../utils/devicePersistence";

export type SessionEvent =
  | { type: "start"; sessionId: string; at: number }
  // Duration is wall time since the start, so the backend's `start = end - duration` still holds
  // when the start request was lost.
  | { type: "end"; sessionId: string; at: number; durationMs: number };

// PROVISIONAL: more than 30 min in the background starts a new session, the threshold Google
// Analytics and Adjust use, until the API contract settles on an SDK constant or a server value.
export const BACKGROUND_TIMEOUT_MS = 30 * 60 * 1000;

/** Analytics sessions: one `session_id` per continuous use of the app, kept in memory only. */
export class SessionManager {
  private send: ((event: SessionEvent) => void) | null = null;
  private sessionId: string | null = null;
  private startedAt = 0;
  private backgroundedAt: number | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  start(send: (event: SessionEvent) => void) {
    this.send ??= send;
  }

  stop() {
    this.send = null;
    this.sessionId = null;
    this.backgroundedAt = null;
  }

  /** The first foreground starts a session; a return after the timeout starts a new one. */
  onForeground() {
    if (!this.send) return;
    const { backgroundedAt } = this;
    this.backgroundedAt = null;
    const expired = backgroundedAt !== null && this.now() - backgroundedAt > BACKGROUND_TIMEOUT_MS;
    if (this.sessionId !== null && !expired) return;

    this.sessionId = generateUUID();
    this.startedAt = this.now();
    this.send({ type: "start", sessionId: this.sessionId, at: this.startedAt });
  }

  // The app can be killed in the background without notice, so every trip to the background
  // reports the end. If the user returns in time, a later end of the same session replaces it.
  onBackground() {
    if (!this.send || this.sessionId === null) return;
    const at = this.now();
    this.backgroundedAt = at;
    this.send({ type: "end", sessionId: this.sessionId, at, durationMs: at - this.startedAt });
  }
}

export const sessionManager = new SessionManager();
