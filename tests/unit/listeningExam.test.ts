import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeListeningExamStart, decodePlayResult } from "../../lib/api/listeningExam";
import { decidePolicy } from "../../lib/server/proxyPolicy";

const fetchApi = vi.fn();
vi.mock("../../lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => fetchApi(...args),
}));

const startPayload = {
  examSessionId: "lex-1",
  timeLimitSeconds: 90,
  items: [
    { position: 0, audioUrl: "https://example.com/a.mp3", prompt: "A?", options: ["1", "2", "3", "4"], transcript: "nope" },
  ],
};

describe("listening exam contract", () => {
  it("trusts timeLimitSeconds and drops transcripts", () => {
    const start = decodeListeningExamStart(startPayload);
    expect(start?.timeLimitSeconds).toBe(90);
    expect(JSON.stringify(start)).not.toContain("nope");
  });

  it("decodes live Express items[].listening.audioUrl + question.options", () => {
    const start = decodeListeningExamStart({
      examSessionId: "lex-live",
      timeLimitSeconds: 1200,
      items: [
        {
          position: 1,
          listening: { id: "lis-1", title: "Update", audioUrl: "https://cdn.example.com/a.mp3" },
          question: { id: "q-1", question: "A?", options: ["1", "2", "3", "4"] },
        },
      ],
    });
    expect(start?.examSessionId).toBe("lex-live");
    expect(start?.items[0]).toMatchObject({
      position: 1,
      audioUrl: "https://cdn.example.com/a.mp3",
      prompt: "A?",
    });
    expect(start?.items[0]?.options).toHaveLength(4);
  });

  it("does not start playback unless play is allowed", () => {
    expect(decodePlayResult({ allowed: false, allowSeek: true }).allowed).toBe(false);
    expect(decodePlayResult({ allowed: true, allowSeek: true }).allowSeek).toBe(false);
    expect(decodePlayResult({ allowed: true }).allowed).toBe(true);
  });

  it("EXAM-REAL-003 — decodes the global replay budget on start, defaulting the remaining count to the full budget", () => {
    const start = decodeListeningExamStart({ ...startPayload, globalReplayBudget: 3 });
    expect(start?.globalReplayBudget).toBe(3);
    expect(start?.globalReplaysRemaining).toBe(3);
  });

  it("EXAM-REAL-003 — a legacy session (no global budget in the response) decodes both as null, not 0", () => {
    const start = decodeListeningExamStart(startPayload);
    expect(start?.globalReplayBudget).toBeNull();
    expect(start?.globalReplaysRemaining).toBeNull();
  });

  it("EXAM-REAL-003 — decodes the global replay budget from a /exam/play response", () => {
    const play = decodePlayResult({ allowed: true, globalReplayBudget: 3, globalReplaysRemaining: 2 });
    expect(play.globalReplayBudget).toBe(3);
    expect(play.globalReplaysRemaining).toBe(2);
  });

  it("EXAM-REAL-003 — a legacy /exam/play response (no global fields) decodes them as null", () => {
    const play = decodePlayResult({ allowed: true, playsUsed: 1, maxPlays: 2 });
    expect(play.globalReplayBudget).toBeNull();
    expect(play.globalReplaysRemaining).toBeNull();
  });

  it("keeps play/state/finish on the allowlist and recommendation denied", () => {
    expect(decidePolicy("POST", "/api/listening/slp/exam/play")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/listening/slp/exam/state")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/listening/slp/exam/finish")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/listening/recommendation")).toMatchObject({ action: "deny", status: 410 });
  });
});

describe("listening exam session", () => {
  beforeEach(async () => {
    fetchApi.mockReset();
    fetchApi.mockResolvedValue(startPayload);
    const mod = await import("../../lib/listening/examSession");
    mod.clearListeningExamIntent("user-1");
  });

  it("starts once and requires play before treating audio as authorised", async () => {
    const { startListeningExam, requestListeningPlay } = await import("../../lib/listening/examSession");
    fetchApi.mockResolvedValueOnce(startPayload);
    const start = await startListeningExam("user-1");
    expect(start.examSessionId).toBe("lex-1");
    fetchApi.mockResolvedValueOnce({ allowed: true });
    const play = await requestListeningPlay("lex-1", 0);
    expect(play.allowed).toBe(true);
    expect(fetchApi.mock.calls[0][0]).toBe("/listening/slp/exam/start");
    expect(fetchApi.mock.calls[1][0]).toBe("/listening/slp/exam/play");
  });

  /**
   * ER-02 — the answer POST reports what happened instead of swallowing it.
   *
   * `retryable` is the load-bearing field: the write is an UPDATE keyed by
   * (session, position), so re-sending is safe and free, but a 409 means the
   * session is gone and retrying would only repeat the refusal.
   */
  it("classifies answer outcomes so a dropped POST is never mistaken for a save", async () => {
    const { submitListeningExamAnswer } = await import("../../lib/listening/examSession");

    fetchApi.mockResolvedValueOnce({ ok: true, saved: true, position: 3, secondsRemaining: 900 });
    expect(await submitListeningExamAnswer("lex-1", 3, 2)).toEqual({
      status: "saved",
      position: 3,
      secondsRemaining: 900,
    });

    // A 2xx whose body does not confirm the write is NOT evidence of a save.
    fetchApi.mockResolvedValueOnce({ something: "else" });
    expect(await submitListeningExamAnswer("lex-1", 3, 2)).toMatchObject({
      status: "failed",
      retryable: true,
      reason: "unconfirmed",
    });

    fetchApi.mockRejectedValueOnce(Object.assign(new Error("closed"), { status: 409 }));
    expect(await submitListeningExamAnswer("lex-1", 3, 2)).toMatchObject({
      status: "failed",
      retryable: false,
      reason: "session_closed",
    });

    fetchApi.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 503 }));
    expect(await submitListeningExamAnswer("lex-1", 3, 2)).toMatchObject({ status: "failed", retryable: true });

    fetchApi.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await submitListeningExamAnswer("lex-1", 3, 2)).toMatchObject({
      status: "failed",
      retryable: true,
      reason: "transport",
    });
  });

  /**
   * The predicate that stands between a learner and a silently blank answer.
   * `finishListeningExam` posts no answers, so anything this returns is exactly
   * what the server would score as unanswered.
   */
  it("counts an answered-but-unconfirmed item as unsent, and an untouched one as neither", async () => {
    const { unsentAnswerPositions } = await import("../../lib/listening/examSession");
    const items = [{ position: 1 }, { position: 2 }, { position: 3 }];

    expect(unsentAnswerPositions(items, [0, 1, 2], { 1: "saved", 2: "saved", 3: "saved" })).toEqual([]);
    // In flight is not confirmed.
    expect(unsentAnswerPositions(items, [0, 1, 2], { 1: "saved", 2: "saving", 3: "failed" })).toEqual([2, 3]);
    // Never answered: not unsent, and never reported as a loss.
    expect(unsentAnswerPositions(items, [0, -1, -1], { 1: "saved" })).toEqual([]);
    expect(unsentAnswerPositions(items, [-1, 1, -1], {})).toEqual([2]);
  });
});
