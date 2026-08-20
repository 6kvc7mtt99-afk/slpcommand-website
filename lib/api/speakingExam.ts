// EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking, decoders.
//
// Same discipline as lib/api/listeningExam.ts: every field is decoded defensively
// (pickAlias + asX helpers), nothing here calls fetch, and the raw shape mirrors
// exactly what server.js's five /api/speaking/exam/* routes return (see server.js
// EXAM-REAL-003 CHECKPOINT 3 section) — no field is renamed to a "nicer" client
// vocabulary that would then need to be kept in sync by hand.

import { asBool, asNumber, asString, isRecord, pickAlias } from "./decode";

export type SpeakingExamPrompt = {
  id: string;
  title: string;
  instruction: string;
};

export type SpeakingExamTask = {
  taskIndex: number;
  level: number;
  role: string;
  slot: string;
  interactive: boolean;
  prompt: SpeakingExamPrompt | null;
  preparationSeconds: number;
  speakingSecondsPerTurn: number;
  examinerFollowUpTurns: number;
};

export type SpeakingWarmupTurn = {
  turnIndex: number;
  secondsAllotted: number;
  totalTurns: number;
  question: string | null;
};

function decodePrompt(raw: unknown): SpeakingExamPrompt | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  return { id, title: asString(raw.title), instruction: asString(raw.instruction) };
}

export function decodeSpeakingTask(raw: unknown): SpeakingExamTask | null {
  if (!isRecord(raw)) return null;
  return {
    taskIndex: asNumber(pickAlias(raw, "taskIndex"), 0),
    level: asNumber(pickAlias(raw, "level"), 3),
    role: asString(pickAlias(raw, "role")),
    slot: asString(pickAlias(raw, "slot")),
    interactive: asBool(pickAlias(raw, "interactive"), false),
    prompt: decodePrompt(raw.prompt),
    preparationSeconds: asNumber(pickAlias(raw, "preparationSeconds"), 45),
    speakingSecondsPerTurn: asNumber(pickAlias(raw, "speakingSecondsPerTurn"), 90),
    examinerFollowUpTurns: asNumber(pickAlias(raw, "examinerFollowUpTurns"), 0),
  };
}

function decodeWarmupTurn(raw: unknown): SpeakingWarmupTurn | null {
  if (!isRecord(raw)) return null;
  return {
    turnIndex: asNumber(pickAlias(raw, "turnIndex"), 0),
    secondsAllotted: asNumber(pickAlias(raw, "secondsAllotted"), 100),
    totalTurns: asNumber(pickAlias(raw, "totalTurns"), 3),
    question: asString(pickAlias(raw, "question")) || null,
  };
}

export type SpeakingExamStart = {
  examSessionId: string;
  phase: string;
  timeLimitSeconds: number;
  expiresAt: string;
  startedAt: string;
  warmup: SpeakingWarmupTurn;
};

export function decodeSpeakingExamStart(raw: unknown): SpeakingExamStart | null {
  if (!isRecord(raw)) return null;
  const examSessionId = asString(pickAlias(raw, "examSessionId"));
  const warmup = decodeWarmupTurn(raw.warmup);
  if (!examSessionId || !warmup) return null;
  return {
    examSessionId,
    phase: asString(pickAlias(raw, "phase"), "warmup"),
    timeLimitSeconds: asNumber(pickAlias(raw, "timeLimitSeconds"), 0),
    expiresAt: asString(pickAlias(raw, "expiresAt")),
    startedAt: asString(pickAlias(raw, "startedAt")),
    warmup,
  };
}

// Discriminated on warmupComplete, exactly like the raw response — still mid warm-up
// (another question) or transitioning into the evaluated phase (the first task).
export type SpeakingWarmupRespondResult =
  | { warmupComplete: false; phase: string; warmup: SpeakingWarmupTurn; secondsRemaining: number | null }
  | { warmupComplete: true; phase: string; timeLimitSeconds: number; task: SpeakingExamTask; secondsRemaining: number | null };

export function decodeWarmupRespond(raw: unknown): SpeakingWarmupRespondResult | null {
  if (!isRecord(raw)) return null;
  const phase = asString(pickAlias(raw, "phase"));
  const secondsRemaining = pickAlias(raw, "secondsRemaining") == null ? null : asNumber(raw.secondsRemaining);
  if (raw.warmupComplete === true) {
    const task = decodeSpeakingTask(raw.task);
    if (!task) return null;
    return { warmupComplete: true, phase, timeLimitSeconds: asNumber(pickAlias(raw, "timeLimitSeconds"), 0), task, secondsRemaining };
  }
  const warmup = decodeWarmupTurn(raw.warmup);
  if (!warmup) return null;
  return { warmupComplete: false, phase, warmup, secondsRemaining };
}

export type SpeakingExaminerTurn = { move: string; utterance: string };

// Discriminated on taskComplete, then on sessionComplete — mirrors the raw response's
// own three-way shape rather than inventing a fourth client-side vocabulary for it.
export type SpeakingRespondResult =
  | { taskComplete: false; phase: string; examinerTurn: SpeakingExaminerTurn; secondsRemaining: number | null }
  | { taskComplete: true; sessionComplete: true; phase: string; message: string }
  | { taskComplete: true; sessionComplete: false; phase: string; task: SpeakingExamTask; secondsRemaining: number | null };

export function decodeRespond(raw: unknown): SpeakingRespondResult | null {
  if (!isRecord(raw)) return null;
  const phase = asString(pickAlias(raw, "phase"));
  if (raw.taskComplete === true) {
    if (raw.sessionComplete === true) {
      return { taskComplete: true, sessionComplete: true, phase, message: asString(pickAlias(raw, "message")) };
    }
    const task = decodeSpeakingTask(raw.task);
    if (!task) return null;
    const secondsRemaining = pickAlias(raw, "secondsRemaining") == null ? null : asNumber(raw.secondsRemaining);
    return { taskComplete: true, sessionComplete: false, phase, task, secondsRemaining };
  }
  const examinerTurnRaw = raw.examinerTurn;
  if (!isRecord(examinerTurnRaw)) return null;
  const secondsRemaining = pickAlias(raw, "secondsRemaining") == null ? null : asNumber(raw.secondsRemaining);
  return {
    taskComplete: false,
    phase,
    examinerTurn: { move: asString(examinerTurnRaw.move), utterance: asString(examinerTurnRaw.utterance) },
    secondsRemaining,
  };
}

export type SpeakingExamRating = {
  rating: string | null;
  ratingText: string;
  floorLevel: number | null;
  floorEstablished: boolean;
  ceilingUntested: boolean;
  plusRating: boolean;
  isRatable: boolean | null;
};

function decodeRating(raw: unknown): SpeakingExamRating {
  const rec = isRecord(raw) ? raw : {};
  return {
    rating: asString(pickAlias(rec, "rating")) || null,
    ratingText: asString(pickAlias(rec, "ratingText"), "Not yet rated."),
    floorLevel: pickAlias(rec, "floorLevel") == null ? null : asNumber(rec.floorLevel),
    floorEstablished: asBool(pickAlias(rec, "floorEstablished"), false),
    ceilingUntested: asBool(pickAlias(rec, "ceilingUntested"), false),
    plusRating: asBool(pickAlias(rec, "plusRating"), false),
    isRatable: rec.isRatable == null ? null : asBool(rec.isRatable, false),
  };
}

export type SpeakingExamCoverage = {
  floorLevel: number | null;
  floorEstablished: boolean;
  ceilingProbed: boolean;
  ceilingUntested: boolean;
};

function decodeCoverage(raw: unknown): SpeakingExamCoverage {
  const rec = isRecord(raw) ? raw : {};
  return {
    floorLevel: pickAlias(rec, "floorLevel") == null ? null : asNumber(rec.floorLevel),
    floorEstablished: asBool(pickAlias(rec, "floorEstablished"), false),
    ceilingProbed: asBool(pickAlias(rec, "ceilingProbed"), false),
    ceilingUntested: asBool(pickAlias(rec, "ceilingUntested"), false),
  };
}

export type SpeakingExamFinish = {
  examSessionId: string;
  status: string;
  phase: string;
  alreadyFinished: boolean;
  rating: SpeakingExamRating;
  coverage: SpeakingExamCoverage;
  legacyBand: string | null;
  ratable: boolean | null;
  ratableReason: string | null;
};

export function decodeFinish(raw: unknown): SpeakingExamFinish | null {
  if (!isRecord(raw)) return null;
  const examSessionId = asString(pickAlias(raw, "examSessionId"));
  if (!examSessionId) return null;
  const legacyRaw = isRecord(raw.legacy) ? raw.legacy : {};
  const ratableSampleRaw = isRecord(raw.ratableSample) ? raw.ratableSample : {};
  return {
    examSessionId,
    status: asString(pickAlias(raw, "status")),
    phase: asString(pickAlias(raw, "phase")),
    alreadyFinished: asBool(pickAlias(raw, "alreadyFinished"), false),
    rating: decodeRating(raw.rating),
    coverage: decodeCoverage(raw.coverage),
    legacyBand: asString(pickAlias(legacyRaw, "band")) || null,
    ratable: ratableSampleRaw.ratable == null ? null : asBool(ratableSampleRaw.ratable, false),
    // assessRatableSample (lib/speakingReds.js) returns `reasons` as a string ARRAY, not
    // a single field — joined here into one sentence for display.
    ratableReason: Array.isArray(ratableSampleRaw.reasons) && ratableSampleRaw.reasons.length
      ? ratableSampleRaw.reasons.map((r) => asString(r)).filter(Boolean).join("; ")
      : null,
  };
}

export type SpeakingExamState = {
  examSessionId: string;
  state: string;
  terminal: boolean;
  phase: string;
  secondsRemaining: number | null;
  timeLimitSeconds: number;
  warmup: SpeakingWarmupTurn | null;
  task: SpeakingExamTask | null;
  // Resume support: set only when the candidate refreshed after the AI examiner spoke
  // but before they answered — the question they were mid-way through responding to.
  pendingExaminerTurn: SpeakingExaminerTurn | null;
  turnsSoFar: number;
  tasksCompleted: number;
  rating: SpeakingExamRating | null;
};

export function decodeSpeakingExamState(raw: unknown): SpeakingExamState | null {
  if (!isRecord(raw)) return null;
  const examSessionId = asString(pickAlias(raw, "examSessionId"));
  if (!examSessionId) return null;
  return {
    examSessionId,
    state: asString(pickAlias(raw, "state")),
    terminal: asBool(pickAlias(raw, "terminal"), false),
    phase: asString(pickAlias(raw, "phase")),
    secondsRemaining: pickAlias(raw, "secondsRemaining") == null ? null : asNumber(raw.secondsRemaining),
    timeLimitSeconds: asNumber(pickAlias(raw, "timeLimitSeconds"), 0),
    warmup: decodeWarmupTurn(raw.warmup),
    task: decodeSpeakingTask(raw.task),
    pendingExaminerTurn: isRecord(raw.pendingExaminerTurn)
      ? { move: asString(raw.pendingExaminerTurn.move), utterance: asString(raw.pendingExaminerTurn.utterance) }
      : null,
    turnsSoFar: asNumber(pickAlias(raw, "turnsSoFar"), 0),
    tasksCompleted: asNumber(pickAlias(raw, "tasksCompleted"), 0),
    rating: raw.rating == null ? null : decodeRating(raw.rating),
  };
}
