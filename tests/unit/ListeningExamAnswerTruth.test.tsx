/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ER-02 — an answer the server never received must never be scored as a blank
 * without the learner being told.
 *
 * The defect: `choose()` awaited `POST /listening/slp/exam/answer` inside a bare
 * `try/catch {}` whose comment read "keep local selection; finish still sends
 * last known". That comment was false. `finishListeningExam` posts the
 * examSessionId and nothing else, so the server scores whatever it happens to
 * hold. A single dropped POST therefore left the option highlighted on screen
 * while the item was marked UNANSWERED — on a timed exam that costs one credit
 * a month on the Free plan.
 *
 * These two tests are the contract: a delivered answer produces a truthful
 * result, and an undelivered one produces an explicit, recoverable failure.
 */

const fetchApi = vi.fn();

vi.mock("../../lib/api/client", () => {
  class FrontendError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 500) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    apiRequest: (...args: unknown[]) => fetchApi(...args),
    FrontendError,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

/** Two items, so "how many answers are unsent" is a real count and not a boolean. */
const startPayload = {
  examSessionId: "lex-truth",
  timeLimitSeconds: 1200,
  items: [
    { position: 1, audioUrl: "https://cdn.example.com/1.mp3", prompt: "First question?", options: ["Alpha", "Bravo", "Charlie", "Delta"] },
    { position: 2, audioUrl: "https://cdn.example.com/2.mp3", prompt: "Second question?", options: ["Echo", "Foxtrot", "Golf", "Hotel"] },
  ],
};

/** The real `/listening/slp/exam/finish` envelope. */
const finishPayload = {
  totalQuestions: 2,
  correctAnswers: 2,
  percentage: 100,
  estimatedSlpLevel: "3",
  reds: "Adequate",
};

/** Calls to one endpoint, so quota-bearing routes can be counted exactly. */
const callsTo = (path: string) => fetchApi.mock.calls.filter((call) => call[0] === path);

async function startExam() {
  const { ListeningExam } = await import("../../components/listening/ListeningExam");
  render(<ListeningExam />);
  fireEvent.click(await screen.findByRole("button", { name: /I understand — start exam/i }));
  await screen.findByRole("button", { name: /Alpha/ });
}

afterEach(() => {
  cleanup();
});

describe("ER-02 — listening exam answer delivery", () => {
  beforeEach(async () => {
    fetchApi.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ userId: "user-1" }) })),
    );
    const session = await import("../../lib/listening/examSession");
    session.clearListeningExamIntent("user-1");
  });

  /**
   * VALID ANSWER POST → persisted → confirmation reaches the frontend → the
   * exam result stays truthful.
   */
  it("sends the answer, records the server's confirmation, and finishes with the server's own result", async () => {
    fetchApi.mockImplementation(async (path: string, init: { body?: Record<string, unknown> }) => {
      if (path === "/listening/slp/exam/start") return startPayload;
      if (path === "/listening/slp/exam/answer") {
        // The server's real reply, including the field the client used to discard.
        return { ok: true, saved: true, position: init.body?.position, secondsRemaining: 1180 };
      }
      if (path === "/listening/slp/exam/finish") return finishPayload;
      throw new Error(`unexpected ${path}`);
    });

    await startExam();
    fireEvent.click(screen.getByRole("button", { name: /Bravo/ }));

    await waitFor(() => expect(callsTo("/listening/slp/exam/answer")).toHaveLength(1));
    expect(callsTo("/listening/slp/exam/answer")[0][1].body).toEqual({
      examSessionId: "lex-truth",
      position: 1,
      selectedIndex: 1,
    });

    // A confirmed answer raises no warning: the learner is not nagged about a
    // write that succeeded.
    expect(screen.queryByText(/hasn't reached the server/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Finish exam/i }));

    // The result is the server's, in full — not the bare word "Submitted."
    expect(await screen.findByText(/2 of 2 correct/i)).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("SLP 3")).toBeTruthy();
    expect(screen.getByText("Adequate")).toBeTruthy();
    // Nothing was lost, so nothing is claimed to have been lost.
    expect(screen.queryByText(/never reached the server/i)).toBeNull();
  });

  /**
   * FAILED POST → explicit failure → the item is NOT silently treated as
   * unanswered → the learner gets a recoverable state → quota semantics hold.
   */
  it("surfaces an undelivered answer, refuses to finish silently, and never re-spends the exam credit", async () => {
    let answerShouldFail = true;
    fetchApi.mockImplementation(async (path: string, init: { body?: Record<string, unknown> }) => {
      if (path === "/listening/slp/exam/start") return startPayload;
      if (path === "/listening/slp/exam/answer") {
        if (answerShouldFail) throw new TypeError("Failed to fetch");
        return { ok: true, saved: true, position: init.body?.position, secondsRemaining: 1100 };
      }
      if (path === "/listening/slp/exam/finish") return finishPayload;
      throw new Error(`unexpected ${path}`);
    });

    await startExam();
    fireEvent.click(screen.getByRole("button", { name: /Bravo/ }));

    // 1. EXPLICIT FAILURE. The old code rendered nothing at all here.
    expect(await screen.findByText(/hasn't reached the server/i)).toBeTruthy();
    expect(screen.getByText(/Question 1 hasn't reached the server/i)).toBeTruthy();
    // The selection stays on screen — the learner's input is not thrown away —
    // but it is no longer presented as recorded.
    expect(screen.getByRole("button", { name: /Bravo/ }).getAttribute("aria-pressed")).toBe("true");

    // 2. NOT SILENTLY UNANSWERED. Finishing asks first; it does not submit.
    fireEvent.click(screen.getByRole("button", { name: /^Finish exam$/i }));
    expect(await screen.findByText(/Finish with 1 answer unrecorded\?/i)).toBeTruthy();
    expect(callsTo("/listening/slp/exam/finish")).toHaveLength(0);

    // 3. RECOVERABLE. A transport failure is retryable, and the retry is an
    //    UPDATE keyed by (session, position) — same position, never a new item.
    answerShouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /Keep trying/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Re-send$/i }));
    await waitFor(() => expect(screen.queryByText(/hasn't reached the server/i)).toBeNull());
    const answerCalls = callsTo("/listening/slp/exam/answer");
    expect(answerCalls.every((call) => call[1].body.position === 1)).toBe(true);

    // 4. QUOTA SEMANTICS. Answering is free; the credit was spent at start and
    //    a failed answer must not cause the exam to be started again.
    expect(callsTo("/listening/slp/exam/start")).toHaveLength(1);
    expect(answerCalls.some((call) => call[1].idempotencyKey)).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /^Finish exam$/i }));
    expect(await screen.findByText(/2 of 2 correct/i)).toBeTruthy();
    expect(callsTo("/listening/slp/exam/finish")).toHaveLength(1);
  });

  /**
   * Adversarial: the loss must survive moving around the paper.
   *
   * A learner who hits a blip on question 1, moves on, and answers question 2
   * successfully must not have question 1 quietly forgotten — the per-item save
   * state, not the current index, is what Finish consults.
   */
  it("still reports an earlier unsent answer after the learner has moved on and answered another", async () => {
    let failNext = true;
    fetchApi.mockImplementation(async (path: string, init: { body?: Record<string, unknown> }) => {
      if (path === "/listening/slp/exam/start") return startPayload;
      if (path === "/listening/slp/exam/answer") {
        if (failNext) throw new TypeError("Failed to fetch");
        return { ok: true, saved: true, position: init.body?.position };
      }
      if (path === "/listening/slp/exam/finish") return finishPayload;
      throw new Error(`unexpected ${path}`);
    });

    await startExam();
    fireEvent.click(screen.getByRole("button", { name: /Bravo/ }));
    expect(await screen.findByText(/Question 1 hasn't reached the server/i)).toBeTruthy();

    // Move to question 2 and answer it successfully.
    failNext = false;
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Foxtrot/ }));
    await waitFor(() => expect(callsTo("/listening/slp/exam/answer")).toHaveLength(2));

    // Question 1 is still outstanding, and finishing still asks about it.
    expect(screen.getByText(/Question 1 hasn't reached the server/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Finish exam$/i }));
    // The flush retries it — and now succeeds, so the exam finishes cleanly
    // rather than nagging about a problem that has gone away.
    expect(await screen.findByText(/2 of 2 correct/i)).toBeTruthy();
    expect(screen.queryByText(/never reached the server/i)).toBeNull();
    expect(callsTo("/listening/slp/exam/answer").filter((c) => c[1].body.position === 1)).toHaveLength(2);
  });

  /**
   * Adversarial: time runs out with an answer still unsent.
   *
   * The exam must END — a timed paper cannot be held open by a network problem,
   * and blocking Finish would trap the learner. It must also not pretend: the
   * result has to say what the server never received.
   */
  it("ends the exam when the clock expires and discloses what was lost", async () => {
    fetchApi.mockImplementation(async (path: string) => {
      if (path === "/listening/slp/exam/start") return { ...startPayload, timeLimitSeconds: 1 };
      if (path === "/listening/slp/exam/answer") throw new TypeError("Failed to fetch");
      if (path === "/listening/slp/exam/finish") return finishPayload;
      throw new Error(`unexpected ${path}`);
    });

    await startExam();
    fireEvent.click(screen.getByRole("button", { name: /Bravo/ }));
    expect(await screen.findByText(/Question 1 hasn't reached the server/i)).toBeTruthy();

    // No further interaction: the clock alone must carry this through.
    expect(await screen.findByText(/1 answer never reached the server/i, undefined, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText(/2 of 2 correct/i)).toBeTruthy();
    expect(callsTo("/listening/slp/exam/finish")).toHaveLength(1);
  });

  /**
   * A closed session (409) is terminal: retrying cannot help, so the learner is
   * told the truth and is never trapped inside the exam.
   */
  it("does not offer a pointless retry on a closed session, and still lets the learner out", async () => {
    class Closed extends Error {
      status = 409;
    }
    fetchApi.mockImplementation(async (path: string) => {
      if (path === "/listening/slp/exam/start") return startPayload;
      if (path === "/listening/slp/exam/answer") throw new Closed("session closed");
      if (path === "/listening/slp/exam/finish") return finishPayload;
      throw new Error(`unexpected ${path}`);
    });

    await startExam();
    fireEvent.click(screen.getByRole("button", { name: /Charlie/ }));

    expect(await screen.findByText(/no longer record answers/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Re-send$/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Finish exam$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Finish anyway/i }));

    // The exam ends, and the result page states plainly what was lost.
    expect(await screen.findByText(/1 answer never reached the server/i)).toBeTruthy();
    expect(screen.getByText(/scored as unanswered/i)).toBeTruthy();
  });
});
