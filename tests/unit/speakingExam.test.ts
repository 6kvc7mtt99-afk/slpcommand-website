import { describe, expect, it } from "vitest";
import {
  decodeFinish,
  decodeRespond,
  decodeSpeakingExamStart,
  decodeSpeakingExamState,
  decodeSpeakingTask,
  decodeWarmupRespond,
} from "../../lib/api/speakingExam";
import { decidePolicy, requiresIdempotency } from "../../lib/server/proxyPolicy";

// EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking, Web decoders.
// Fixtures below match server.js's EXAM-REAL-003 CHECKPOINT 3 route shapes exactly,
// including the two resume-support fields added after tracing a real refresh gap
// (_pendingWarmupQuestion / pendingExaminerTurn — see server.js's own comments).

const taskPayload = {
  taskIndex: 3,
  level: 3,
  role: "floor",
  slot: "objection_handling",
  interactive: true,
  prompt: { id: "sp_obj_001", title: "Budget objection", instruction: "Defend your position." },
  preparationSeconds: 45,
  speakingSecondsPerTurn: 60,
  examinerFollowUpTurns: 3,
};

describe("speaking real exam — task decoding", () => {
  it("decodes a full task with its prompt", () => {
    const task = decodeSpeakingTask(taskPayload);
    expect(task).toMatchObject({ taskIndex: 3, level: 3, interactive: true, examinerFollowUpTurns: 3 });
    expect(task?.prompt).toMatchObject({ id: "sp_obj_001", title: "Budget objection" });
  });

  it("rejects a task with no prompt id (would render an empty task)", () => {
    expect(decodeSpeakingTask({ ...taskPayload, prompt: { title: "x", instruction: "y" } })?.prompt).toBeNull();
  });

  it("returns null for a non-object", () => {
    expect(decodeSpeakingTask(null)).toBeNull();
    expect(decodeSpeakingTask("nope")).toBeNull();
  });
});

describe("speaking real exam — /exam/start", () => {
  it("decodes examSessionId + warm-up turn 0", () => {
    const start = decodeSpeakingExamStart({
      examSessionId: "sess-1",
      phase: "warmup",
      timeLimitSeconds: 1464,
      expiresAt: "2026-01-01T00:24:24.000Z",
      startedAt: "2026-01-01T00:00:00.000Z",
      warmup: { turnIndex: 0, secondsAllotted: 100, totalTurns: 3, question: "Tell me about your current role." },
    });
    expect(start?.examSessionId).toBe("sess-1");
    expect(start?.warmup.question).toBe("Tell me about your current role.");
    expect(start?.timeLimitSeconds).toBe(1464);
  });

  it("returns null without a warm-up turn — a session that cannot present its first question is not a usable start", () => {
    expect(decodeSpeakingExamStart({ examSessionId: "sess-2", phase: "warmup" })).toBeNull();
  });
});

describe("speaking real exam — /exam/warmup/respond", () => {
  it("decodes an in-progress turn (warmupComplete: false)", () => {
    const result = decodeWarmupRespond({
      phase: "warmup",
      warmupComplete: false,
      warmup: { turnIndex: 1, secondsAllotted: 100, totalTurns: 3, question: "What do you enjoy outside of work?" },
      secondsRemaining: 1400,
    });
    expect(result?.warmupComplete).toBe(false);
    if (result && !result.warmupComplete) {
      expect(result.warmup.turnIndex).toBe(1);
    }
  });

  it("decodes the transition into the evaluated phase (warmupComplete: true) with the first task", () => {
    const result = decodeWarmupRespond({
      phase: "awaiting_response",
      warmupComplete: true,
      timeLimitSeconds: 1464,
      task: { ...taskPayload, taskIndex: 0, interactive: false, prompt: { id: "sp_opin_001", title: "Opinion", instruction: "Argue for or against." } },
      secondsRemaining: 1300,
    });
    expect(result?.warmupComplete).toBe(true);
    if (result && result.warmupComplete) {
      expect(result.task.taskIndex).toBe(0);
      expect(result.task.prompt?.id).toBe("sp_opin_001");
    }
  });

  it("returns null for a malformed transition (warmupComplete: true but no task)", () => {
    expect(decodeWarmupRespond({ phase: "awaiting_response", warmupComplete: true, timeLimitSeconds: 100 })).toBeNull();
  });
});

describe("speaking real exam — /exam/respond", () => {
  it("decodes an examiner follow-up turn (taskComplete: false)", () => {
    const result = decodeRespond({
      phase: "awaiting_response",
      taskComplete: false,
      examinerTurn: { move: "objection", utterance: "Some people would disagree — how would you respond?" },
      secondsRemaining: 900,
    });
    expect(result?.taskComplete).toBe(false);
    if (result && !result.taskComplete) {
      expect(result.examinerTurn.move).toBe("objection");
    }
  });

  it("decodes a completed task with the next task (taskComplete: true, sessionComplete: false)", () => {
    const result = decodeRespond({
      phase: "awaiting_response",
      taskComplete: true,
      sessionComplete: false,
      task: taskPayload,
      secondsRemaining: 800,
    });
    expect(result?.taskComplete).toBe(true);
    if (result && result.taskComplete && !result.sessionComplete) {
      expect(result.task.taskIndex).toBe(3);
    }
  });

  it("decodes session completion (taskComplete: true, sessionComplete: true) with no task field required", () => {
    const result = decodeRespond({
      phase: "rating",
      taskComplete: true,
      sessionComplete: true,
      message: "All tasks administered. Call /api/speaking/exam/finish to receive the result.",
    });
    expect(result).toMatchObject({ taskComplete: true, sessionComplete: true });
  });

  it("returns null when neither an examiner turn nor a task is present", () => {
    expect(decodeRespond({ phase: "awaiting_response", taskComplete: false })).toBeNull();
  });
});

describe("speaking real exam — /exam/finish", () => {
  it("decodes a ratable session's rating, coverage and legacy band", () => {
    const finish = decodeFinish({
      examSessionId: "sess-1",
      status: "finished",
      phase: "complete",
      rating: {
        rating: "3", ratingText: "Level 3 — ceiling not tested at this stage count.",
        floorLevel: 3, floorEstablished: true, ceilingUntested: true, plusRating: false, isRatable: true,
      },
      coverage: { floorLevel: 3, floorEstablished: true, ceilingProbed: false, ceilingUntested: true },
      ratableSample: { ratable: true, reasons: [], outcome: "ratable" },
      legacy: { band: "3", estimatedSlp: 3.0 },
    });
    expect(finish?.rating.rating).toBe("3");
    expect(finish?.rating.ceilingUntested).toBe(true);
    expect(finish?.ratable).toBe(true);
    expect(finish?.ratableReason).toBeNull();
    expect(finish?.legacyBand).toBe("3");
  });

  it("joins a non-ratable session's reasons array into one readable string, not '[object Object]'", () => {
    const finish = decodeFinish({
      examSessionId: "sess-2",
      status: "finished",
      phase: "complete",
      rating: { rating: null, ratingText: "No stage was administered.", floorEstablished: false },
      coverage: { floorEstablished: false, ceilingProbed: false, ceilingUntested: false },
      ratableSample: {
        ratable: false,
        reasons: ["only 2 usable response(s); 3 required", "only 2 distinct task type(s); 3 required for variety"],
        outcome: "no_rating",
      },
      legacy: { band: null, estimatedSlp: null },
    });
    expect(finish?.ratable).toBe(false);
    expect(finish?.ratableReason).toBe(
      "only 2 usable response(s); 3 required; only 2 distinct task type(s); 3 required for variety",
    );
  });

  it("decodes an idempotent already-finished response the same way as a fresh one", () => {
    const finish = decodeFinish({
      examSessionId: "sess-1", alreadyFinished: true, status: "finished", phase: "complete",
      rating: { rating: "3+", ratingText: "Level 3+" },
    });
    expect(finish?.alreadyFinished).toBe(true);
    expect(finish?.rating.rating).toBe("3+");
  });

  it("returns null without an examSessionId", () => {
    expect(decodeFinish({ status: "finished" })).toBeNull();
  });
});

describe("speaking real exam — /exam/state (resume support)", () => {
  it("recovers the pending warm-up question by turn/text, for a refresh mid warm-up", () => {
    const state = decodeSpeakingExamState({
      examSessionId: "sess-1", state: "in_progress", terminal: false, phase: "warmup",
      secondsRemaining: 1200, timeLimitSeconds: 1464,
      warmup: { turnIndex: 1, secondsAllotted: 100, totalTurns: 3, question: "What do you enjoy outside of work?" },
    });
    expect(state?.phase).toBe("warmup");
    expect(state?.warmup?.question).toBe("What do you enjoy outside of work?");
  });

  it("recovers a pending (unanswered) examiner follow-up for a refresh mid interactive exchange", () => {
    const state = decodeSpeakingExamState({
      examSessionId: "sess-1", state: "in_progress", terminal: false, phase: "awaiting_response",
      secondsRemaining: 700, timeLimitSeconds: 1464,
      task: taskPayload,
      pendingExaminerTurn: { move: "clarification_request", utterance: "Could you clarify what you meant by that?" },
      turnsSoFar: 1, tasksCompleted: 2,
    });
    expect(state?.pendingExaminerTurn).toMatchObject({ move: "clarification_request" });
    expect(state?.turnsSoFar).toBe(1);
  });

  it("has no pending examiner turn for a freshly-presented task (turnsSoFar 0)", () => {
    const state = decodeSpeakingExamState({
      examSessionId: "sess-1", state: "in_progress", terminal: false, phase: "awaiting_response",
      task: taskPayload, turnsSoFar: 0, tasksCompleted: 1,
    });
    expect(state?.pendingExaminerTurn).toBeNull();
  });

  it("a terminal session carries its stored rating, not phase-specific fields", () => {
    const state = decodeSpeakingExamState({
      examSessionId: "sess-1", state: "finished", terminal: true, phase: "complete",
      rating: { rating: "3", ratingText: "Level 3" },
    });
    expect(state?.terminal).toBe(true);
    expect(state?.rating?.rating).toBe("3");
  });
});

describe("speaking real exam — proxy policy", () => {
  it("allows all five /api/speaking/exam/* routes through the proxy", () => {
    expect(decidePolicy("POST", "/api/speaking/exam/start")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/exam/warmup/respond")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/exam/respond")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/exam/finish")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/exam/state")).toEqual({ action: "forward" });
  });

  it("does not require an idempotency key — there is no quota to protect against a retry (documented backend omission)", () => {
    expect(requiresIdempotency("POST", "/api/speaking/exam/start")).toBe(false);
  });

  it("still denies an unrelated speaking path with no matching rule", () => {
    const decision = decidePolicy("POST", "/api/speaking/exam/delete-everything");
    expect(decision.action).toBe("deny");
  });
});
