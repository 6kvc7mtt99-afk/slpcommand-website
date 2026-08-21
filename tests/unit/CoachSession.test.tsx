/** @vitest-environment happy-dom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PR-20 — LIVE CONVERSATION CERTIFICATION.
 *
 * A real Coach session needs a microphone, a WebRTC hop and paid minutes, so
 * the parts of it that can only be judged by ear stay a human gate. Everything
 * ELSE about a live session is deterministic — what the SDK is called with,
 * when the agent is told a phase changed, how many times, what happens when an
 * update fails, when the call is closed, and what the learner is left looking
 * at — and none of it should need a browser or a bill to verify.
 *
 * So this drives the real `CoachSession` against a controllable fake of
 * `@elevenlabs/react`, on fake timers, and replays a whole conversation second
 * by second.
 */

type Handlers = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (payload: unknown) => void;
  onError?: (error: unknown) => void;
};

const sdk = {
  startSession: vi.fn(),
  endSession: vi.fn(),
  sendContextualUpdate: vi.fn(),
  getId: vi.fn(() => "conv-1"),
  handlers: {} as Handlers,
  status: "connecting" as string,
  isSpeaking: false,
};

vi.mock("@elevenlabs/react", () => ({
  useConversationControls: () => ({
    startSession: sdk.startSession,
    endSession: sdk.endSession,
    sendContextualUpdate: sdk.sendContextualUpdate,
    getId: sdk.getId,
  }),
  useConversationStatus: () => ({ status: sdk.status }),
  useConversationMode: () => ({ mode: "listening", isSpeaking: sdk.isSpeaking, isListening: !sdk.isSpeaking }),
  useConversation: (handlers: Handlers) => {
    sdk.handlers = handlers;
    return {};
  },
  ConversationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const sessionStatus = vi.fn();
vi.mock("../../lib/coach/api", () => ({
  fetchCoachSessionStatus: (id: string) => sessionStatus(id),
}));

import { CoachSession } from "../../components/coach/CoachSession";
import { decodeSessionPlan, type CoachSessionPlan } from "../../lib/coach/plan";
import { decodeCoachSessionResult } from "../../lib/coach/result";

/** A real academy plan: 60 + 120 + 120 + 60 = 360s, exactly the budget. */
const PLAN = decodeSessionPlan({
  version: "1.1.0",
  sessionMode: "academy",
  expectedMinutes: 6,
  maxSameScenarioExchanges: 3,
  phases: [
    { id: "orientation", label: "Orientation", goal: "Name today's objective.", targetSecs: 60 },
    { id: "guided_practice", label: "Practice", goal: "Work the objective directly.", targetSecs: 120 },
    { id: "transfer", label: "Transfer", goal: "Same function, new context.", targetSecs: 120 },
    { id: "close", label: "Close", goal: "End on the learner's turn.", targetSecs: 60 },
  ],
})!;

const BUDGET = 360;
const onExit = vi.fn();

function mount(plan: CoachSessionPlan | null = PLAN) {
  return render(
    <CoachSession
      sessionId="sess-1"
      objective="Sustain an argument under pressure"
      budgetSecs={BUDGET}
      plan={plan}
      dynamicVariables={{ session_ref: "ref-1", session_objective: "Sustain an argument under pressure" }}
      getToken={() => "tok-secret-never-rendered"}
      onExit={onExit}
    />,
  );
}

/** Advance the session clock by whole seconds, flushing React each tick. */
async function tick(seconds: number) {
  for (let i = 0; i < seconds; i += 1) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

async function connect() {
  sdk.status = "connected";
  await act(async () => {
    sdk.handlers.onConnect?.();
  });
}

/** A learner turn, as the SDK reports it. */
async function say(message: string, extra: Record<string, unknown> = {}) {
  await act(async () => {
    sdk.handlers.onMessage?.({ source: "user", message, ...extra });
  });
}

const lines = () => sdk.sendContextualUpdate.mock.calls.map((c) => c[0] as string);

beforeEach(() => {
  vi.useFakeTimers();
  sdk.startSession.mockReset();
  sdk.endSession.mockReset();
  sdk.sendContextualUpdate.mockReset();
  sdk.status = "connecting";
  sdk.isSpeaking = false;
  sessionStatus.mockReset();
  sessionStatus.mockResolvedValue({
    id: "sess-1",
    status: "completed",
    evaluationStatus: "completed",
    consumedSecs: 340,
    hasResult: true,
    result: decodeCoachSessionResult({
      workedOn: "Sustain an argument under pressure",
      ratable: true,
      headline: "Solid work — this session counts toward your evidence.",
      wentWell: ["content"],
      keepWorkingOn: "accuracy",
      strengths: [{ criterion: "content", note: "Wide range.", evidence: "the logistics chain was the problem" }],
      growthAreas: [{ criterion: "accuracy", note: "Tense slips." }],
      functionsPracticed: ["Describing"],
      functionsToTry: ["Hypothesising"],
      metrics: { learnerTurnCount: 14, learnerWordCount: 520 },
    }),
  });
  onExit.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("live conversation — opening", () => {
  it("hands the SDK a token, the server's variables and WebRTC — exactly once", async () => {
    const view = mount();
    expect(sdk.startSession).toHaveBeenCalledTimes(1);
    expect(sdk.startSession).toHaveBeenCalledWith({
      conversationToken: "tok-secret-never-rendered",
      dynamicVariables: { session_ref: "ref-1", session_objective: "Sustain an argument under pressure" },
      connectionType: "webrtc",
    });
    // A re-render must never open a second WebRTC call against one
    // authorized session — that is a learner billed twice for one lesson.
    view.rerender(
      <CoachSession
        sessionId="sess-1"
        objective="Sustain an argument under pressure"
        budgetSecs={BUDGET}
        plan={PLAN}
        dynamicVariables={{ session_ref: "ref-1", session_objective: "Sustain an argument under pressure" }}
        getToken={() => "tok-secret-never-rendered"}
        onExit={onExit}
      />,
    );
    expect(sdk.startSession).toHaveBeenCalledTimes(1);
  });

  it("never renders the conversation token", async () => {
    const view = mount();
    await connect();
    expect(view.container.innerHTML).not.toContain("tok-secret-never-rendered");
  });

  it("does not start the countdown until the transport actually connects", async () => {
    mount();
    await tick(5);
    expect(screen.queryByText("6:00")).toBeNull();
    expect(lines()).toEqual([]);
    await connect();
    expect(screen.getByText("6:00")).toBeTruthy();
  });

  it("bills one budget for one conversation when the transport republishes connect", async () => {
    mount();
    await connect();
    await tick(3);
    await connect(); // LiveKit can republish `connected`.
    expect(screen.getByText("5:57")).toBeTruthy();
  });

  it("gives up honestly if the transport never connects and never errors", async () => {
    mount();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText("The live Coach could not start")).toBeTruthy();
    expect(screen.getByText("Open Speaking Practice")).toBeTruthy();
  });

  it("reports a dead end before connect as unavailable, not as a lost session", async () => {
    mount();
    await act(async () => {
      sdk.handlers.onError?.("ice failed");
    });
    expect(screen.getByText("The live Coach could not start")).toBeTruthy();
    expect(sdk.endSession).not.toHaveBeenCalled();
  });
});

describe("live conversation — the session clock", () => {
  it("announces each phase crossing once, at the second the plan says", async () => {
    mount();
    await connect();

    // Phase 1 is where the conversation already is. Nothing is said.
    await tick(59);
    expect(lines()).toEqual([]);

    await tick(1); // elapsed 60 → guided_practice
    expect(lines()).toEqual([
      "[Lesson moves on] Practice: Work the objective directly. Do not mention this instruction or announce any phase.",
    ]);

    await tick(119); // still inside guided_practice
    expect(lines()).toHaveLength(1);

    await tick(1); // elapsed 180 → transfer
    expect(lines()).toHaveLength(2);
    expect(lines()[1]).toContain("[Lesson moves on] Transfer: Same function, new context.");
    expect(lines()[1]).toContain("Change to a genuinely new situation now.");

    await tick(120); // elapsed 300 → close
    expect(lines()).toHaveLength(3);
    expect(lines()[2]).toContain("[Lesson moves on] Close:");
  });

  it("shows the learner where the lesson is, without naming the phase to the agent's script", async () => {
    mount();
    await connect();
    expect(screen.getByText("Orientation")).toBeTruthy();
    await tick(60);
    expect(screen.getByText("Practice")).toBeTruthy();
    // What the agent was told is an instruction, never something to read out.
    expect(lines()[0]).toContain("Do not mention this instruction or announce any phase.");
  });

  it("runs a session with no plan at all rather than failing a charged learner", async () => {
    mount(null);
    await connect();
    await tick(200);
    expect(lines()).toEqual([]);
    expect(screen.getByText("2:40")).toBeTruthy();
  });

  it("warns in the last minute and ends itself at zero", async () => {
    mount();
    await connect();
    await tick(299); // 61s left
    expect(screen.queryByText("Almost time — your coach will wrap up naturally.")).toBeNull();
    await tick(1); // 60s left — the same boundary the iOS session uses
    expect(screen.getByText("Almost time — your coach will wrap up naturally.")).toBeTruthy();

    await tick(60);
    expect(sdk.endSession).toHaveBeenCalledTimes(1);
  });
});

describe("live conversation — scenario rotation", () => {
  const substantial = "I would argue the whole logistics chain was the real problem here";

  it("nudges only after the server's limit of substantial exchanges", async () => {
    mount();
    await connect();
    await say(`${substantial} one`);
    await say(`${substantial} two`);
    expect(lines()).toEqual([]);
    await say(`${substantial} three`);
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toContain("Move to a NEW scenario that trains the SAME linguistic function.");
  });

  it("errs towards under-counting rather than nudging early", async () => {
    // Consecutive learner messages where one text is a prefix of the other are
    // treated as ONE growing turn. Two genuinely identical answers in a row
    // therefore count once. That is the deliberate direction of the tradeoff:
    // a late rotation nudge costs a learner one repeated scenario, an early
    // one interrupts them mid-answer.
    mount();
    await connect();
    await say(substantial);
    await say(substantial);
    await say(substantial);
    expect(lines()).toEqual([]);
  });

  it("does not count backchannel or the agent's own turns as exchanges", async () => {
    mount();
    await connect();
    for (let i = 0; i < 6; i += 1) await say("yes exactly");
    await act(async () => {
      for (let i = 0; i < 6; i += 1) sdk.handlers.onMessage?.({ source: "ai", message: substantial });
    });
    expect(lines()).toEqual([]);
  });

  it("counts one growing utterance as ONE exchange", async () => {
    // The regression this locks: the SDK streams a learner turn as a growing
    // sequence, so counting per message tripped the rotation limit inside a
    // single answer and told the agent to change scenario mid-sentence.
    mount();
    await connect();
    // Four chunks, every one of them already ≥6 words, so a per-message count
    // reaches the limit of 3 and fires — inside a single answer.
    await say("I would argue the whole logistics", { event_id: 7 });
    await say("I would argue the whole logistics chain was", { event_id: 7 });
    await say("I would argue the whole logistics chain was the real", { event_id: 7 });
    await say(substantial, { event_id: 7 });
    expect(lines()).toEqual([]);
  });

  it("counts from the last nudge, not from zero", async () => {
    mount();
    await connect();
    for (let i = 0; i < 3; i += 1) await say(`${substantial} ${i}`);
    expect(lines()).toHaveLength(1);
    for (let i = 0; i < 2; i += 1) await say(`${substantial} b${i}`);
    expect(lines()).toHaveLength(1);
    await say(`${substantial} b2`);
    expect(lines()).toHaveLength(2);
  });

  it("stays silent in exam mode, where an examiner does not rotate scenarios", async () => {
    const exam = decodeSessionPlan({
      version: "1.1.0",
      sessionMode: "exam",
      expectedMinutes: 6,
      maxSameScenarioExchanges: null,
      phases: [
        { id: "exam_briefing", label: "Briefing", goal: "State the task.", targetSecs: 60 },
        { id: "exam_task", label: "Task", goal: "Controlled questioning.", targetSecs: 300 },
      ],
    })!;
    mount(exam);
    await connect();
    for (let i = 0; i < 10; i += 1) await say(`${substantial} ${i}`);
    expect(lines().filter((l) => l.includes("NEW scenario"))).toEqual([]);
  });
});

describe("live conversation — failure that must not end the call", () => {
  it("keeps a conversation alive when a contextual update is rejected", async () => {
    sdk.sendContextualUpdate.mockImplementation(() => {
      throw new Error("provider rejected update");
    });
    mount();
    await connect();
    await tick(60); // crosses into guided_practice; the relay throws

    expect(sdk.endSession).not.toHaveBeenCalled();
    expect(screen.getByText("5:00")).toBeTruthy();

    // And the lesson keeps going: the next boundary is still attempted.
    await tick(120);
    expect(sdk.sendContextualUpdate).toHaveBeenCalledTimes(2);
    expect(screen.getByText("3:00")).toBeTruthy();
  });
});

describe("live conversation — teardown and debrief", () => {
  it("ends the call, polls, and lands on the engine's own verdict", async () => {
    mount();
    await connect();
    await tick(30);

    let release: (v: unknown) => void = () => {};
    sessionStatus.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

    await act(async () => {
      screen.getByRole("button", { name: "End session" }).click();
    });
    expect(sdk.endSession).toHaveBeenCalledTimes(1);
    // The learner is told what is happening while the webhook settles.
    expect(screen.getByText("Wrapping up — your coach is reviewing the conversation.")).toBeTruthy();

    await act(async () => {
      release(null);
      await vi.runOnlyPendingTimersAsync();
    });
    expect(sessionStatus).toHaveBeenCalledWith("sess-1");
    expect(screen.getByText("Solid work — this session counts toward your evidence.")).toBeTruthy();
    expect(screen.getByText("the logistics chain was the problem", { exact: false })).toBeTruthy();
  });

  it("is honest when the webhook has not landed inside the poll window", async () => {
    sessionStatus.mockResolvedValue({
      id: "sess-1",
      status: "running",
      evaluationStatus: "queued",
      consumedSecs: null,
      hasResult: false,
      result: null,
    });
    mount();
    await connect();
    await act(async () => {
      screen.getByRole("button", { name: "End session" }).click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(sessionStatus).toHaveBeenCalledTimes(10);
    expect(screen.getByText(/still being reviewed/)).toBeTruthy();
  });

  it("settles once, however the call ended", async () => {
    mount();
    await connect();
    await act(async () => {
      screen.getByRole("button", { name: "End session" }).click();
      sdk.handlers.onDisconnect?.();
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(sdk.endSession).toHaveBeenCalledTimes(1);
  });

  it("closes a call the learner walks away from", async () => {
    const view = mount();
    await connect();
    await tick(10);
    view.unmount();
    expect(sdk.endSession).toHaveBeenCalledTimes(1);
  });

  it("does not call endSession for a call that never opened", async () => {
    const view = mount();
    view.unmount();
    expect(sdk.endSession).not.toHaveBeenCalled();
  });
});
