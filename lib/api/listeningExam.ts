import { asBool, asNumber, asString, isRecord, pickAlias } from "./decode";

export type ListeningExamItem = {
  position: number;
  audioUrl: string;
  prompt: string;
  options: string[];
};

export type ListeningExamStart = {
  examSessionId: string;
  timeLimitSeconds: number;
  items: ListeningExamItem[];
  // EXAM-REAL-003 — set only for an SLP3 real-exam session (backend decides which engine a
  // candidate gets from their own profile; these are simply absent on a legacy session).
  // The replay allowance is SHARED across every item, not per item — contrast the
  // legacy/per-item allowance, which this client never surfaced a count for either.
  globalReplayBudget: number | null;
  globalReplaysRemaining: number | null;
};

export type ListeningPlayResult = {
  allowed: boolean;
  allowSeek: boolean;
  playsLeft: number | null;
  globalReplayBudget: number | null;
  globalReplaysRemaining: number | null;
};

export type ListeningExamState = {
  remainingSeconds: number | null;
  answered: boolean[];
  playsLeft: number | null;
  globalReplayBudget: number | null;
  globalReplaysRemaining: number | null;
};

export function decodeListeningExamStart(raw: unknown): ListeningExamStart | null {
  if (!isRecord(raw)) return null;
  const examSessionId = asString(pickAlias(raw, "examSessionId", "examId", "id"));
  if (!examSessionId) return null;
  const list = pickAlias(raw, "items", "questions", "clips");
  const items = Array.isArray(list)
    ? list.filter(isRecord).map((item, index) => ({
        position: asNumber(pickAlias(item, "position", "index"), index),
        audioUrl: asString(
          pickAlias(
            isRecord(item.listening) ? item.listening : item,
            "audioUrl",
            "audio_url",
            "url",
            "src",
            "audio",
          ),
        ),
        prompt: asString(
          pickAlias(
            isRecord(item.question) ? item.question : item,
            "question",
            "prompt",
            "stem",
          ),
        ),
        options: Array.isArray(
          (isRecord(item.question) ? item.question.options || item.question.choices : null) ||
            item.options ||
            item.choices,
        )
          ? (
              ((isRecord(item.question) ? item.question.options || item.question.choices : null) ||
                item.options ||
                item.choices) as unknown[]
            )
              .map((opt) => asString(opt))
              .filter(Boolean)
          : [],
      })).filter((item) => item.audioUrl && item.options.length > 0)
    : [];
  if (items.length === 0) return null;
  return {
    examSessionId,
    timeLimitSeconds: asNumber(pickAlias(raw, "timeLimitSeconds", "timeLimit"), 0),
    items,
    globalReplayBudget: pickAlias(raw, "globalReplayBudget") == null ? null : asNumber(raw.globalReplayBudget),
    globalReplaysRemaining: pickAlias(raw, "globalReplayBudget") == null
      ? null
      // At start, none have been used yet — the budget itself IS the remaining count.
      : asNumber(raw.globalReplayBudget),
  };
}

export function decodePlayResult(raw: unknown): ListeningPlayResult {
  if (!isRecord(raw)) {
    return { allowed: false, allowSeek: false, playsLeft: null, globalReplayBudget: null, globalReplaysRemaining: null };
  }
  return {
    allowed: asBool(pickAlias(raw, "allowed", "ok"), false),
    allowSeek: false,
    playsLeft: pickAlias(raw, "playsLeft", "playsRemaining") == null
      ? null
      : asNumber(pickAlias(raw, "playsLeft", "playsRemaining")),
    // EXAM-REAL-003 — the SHARED budget for a real-exam SLP3 session. Absent (null) on a
    // legacy session, which has no session-level allowance at all.
    globalReplayBudget: pickAlias(raw, "globalReplayBudget") == null ? null : asNumber(raw.globalReplayBudget),
    globalReplaysRemaining: pickAlias(raw, "globalReplaysRemaining") == null
      ? null
      : asNumber(raw.globalReplaysRemaining),
  };
}

export function decodeExamState(raw: unknown, length: number): ListeningExamState {
  if (!isRecord(raw)) {
    return {
      remainingSeconds: null, answered: Array(length).fill(false), playsLeft: null,
      globalReplayBudget: null, globalReplaysRemaining: null,
    };
  }
  const flags = pickAlias(raw, "answered", "answeredFlags");
  return {
    remainingSeconds: pickAlias(raw, "remainingSeconds", "remainingTimeSeconds") == null
      ? null
      : asNumber(pickAlias(raw, "remainingSeconds", "remainingTimeSeconds")),
    answered: Array.isArray(flags) ? flags.map((flag) => asBool(flag)) : Array(length).fill(false),
    playsLeft: pickAlias(raw, "playsLeft") == null ? null : asNumber(raw.playsLeft),
    globalReplayBudget: pickAlias(raw, "globalReplayBudget") == null ? null : asNumber(raw.globalReplayBudget),
    globalReplaysRemaining: pickAlias(raw, "globalReplaysRemaining") == null
      ? null
      : asNumber(raw.globalReplaysRemaining),
  };
}
