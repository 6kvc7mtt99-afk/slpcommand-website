import { asBool, asString, isRecord, pickAlias } from "@/lib/api/decode";

export type SpeakingCriterion = {
  /**
   * null means the engine did not judge this criterion — NOT that it failed.
   *
   * `rating.criteria` is null whenever rateOneTask declines to rate (a
   * too-short response early-returns with no `verdicts` key at all). Decoding
   * that absence as `false` produced four red "Not met" chips against Content,
   * Task fulfilment, Accuracy and Text produced — telling a learner who had
   * just spent a credit that they had failed all four STANAG criteria, when the
   * engine had explicitly refused to assess. The backend's own projection maps
   * a missing verdict to UNKNOWN, never to NOT_MET.
   */
  met: boolean | null;
  evidence: string;
  note: string;
};

export type SpeakingRating = {
  credited: boolean;
  levelAttempted: string;
  limitingCriterion: string | null;
  failedOn: string[];
  criteria: {
    content: SpeakingCriterion;
    tasks: SpeakingCriterion;
    accuracy: SpeakingCriterion;
    textProduced: SpeakingCriterion;
  };
  band: null;
  confidence: string | null;
  ratable: boolean;
  ratableReason: string | null;
};

export type SpeakingEvaluateResult = {
  attemptId: string;
  createdAt: string;
  transcript: string;
  targetLevel: string;
  promptTitle: string;
  mode: string;
  rating: SpeakingRating;
};

function criterion(raw: unknown): SpeakingCriterion {
  const rec = isRecord(raw) ? raw : {};
  return {
    met: typeof rec.met === "boolean" ? rec.met : null,
    evidence: asString(rec.evidence),
    note: asString(rec.note),
  };
}

/** True when the engine judged at least one criterion. */
export function wasRated(rating: SpeakingRating): boolean {
  return (["content", "tasks", "accuracy", "textProduced"] as const).some(
    (k) => rating.criteria[k].met !== null,
  );
}

/**
 * How a set of exam tasks actually came out, without turning silence into failure.
 *
 * THE BUG THIS SUPPORTS FIXING. The exam summary read
 * `results.filter((r) => r.rating.credited).length` over `results.length`, so a
 * task the engine declined to judge — no verdict on any criterion — was
 * indistinguishable from one that was judged and missed. A learner with one
 * credited task, one genuinely unmet and one never assessed was told "You met
 * the full standard in 1 of 3 tasks", while the card immediately below said
 * that third take was not assessed at all.
 *
 * A proportion is only meaningful over what was measured. The unassessed count
 * is returned so the caller can state it rather than absorb it.
 */
export function summariseExamTasks(results: readonly SpeakingEvaluateResult[]): {
  rated: number;
  credited: number;
  unassessed: number;
} {
  const rated = results.filter((item) => wasRated(item.rating));
  return {
    rated: rated.length,
    credited: rated.filter((item) => item.rating.credited).length,
    unassessed: results.length - rated.length,
  };
}

export function decodeSpeakingEvaluate(raw: unknown): SpeakingEvaluateResult | null {
  const rec = isRecord(raw) ? raw : {};
  const ratingRaw = isRecord(rec.rating) ? rec.rating : {};
  const criteriaRaw = isRecord(ratingRaw.criteria) ? ratingRaw.criteria : {};
  const attemptId = asString(pickAlias(rec, "attempt_id", "attemptId"));
  if (!attemptId) return null;
  return {
    attemptId,
    createdAt: asString(pickAlias(rec, "created_at", "createdAt")),
    transcript: asString(rec.transcript),
    targetLevel: asString(pickAlias(rec, "target_level", "targetLevel")),
    promptTitle: asString(pickAlias(rec, "prompt_title", "promptTitle")),
    mode: asString(rec.mode, "practice"),
    rating: {
      credited: asBool(ratingRaw.credited, false),
      levelAttempted: asString(pickAlias(ratingRaw, "level_attempted", "levelAttempted")),
      limitingCriterion: asString(pickAlias(ratingRaw, "limiting_criterion", "limitingCriterion")) || null,
      failedOn: Array.isArray(ratingRaw.failed_on)
        ? ratingRaw.failed_on.map(String)
        : Array.isArray(ratingRaw.failedOn)
          ? ratingRaw.failedOn.map(String)
          : [],
      criteria: {
        content: criterion(criteriaRaw.content),
        tasks: criterion(criteriaRaw.tasks),
        accuracy: criterion(criteriaRaw.accuracy),
        textProduced: criterion(criteriaRaw.textProduced ?? criteriaRaw.text_produced),
      },
      band: null,
      confidence: asString(pickAlias(ratingRaw, "confidence")) || null,
      ratable: ratingRaw.ratable !== false,
      ratableReason: asString(pickAlias(ratingRaw, "ratable_reason", "ratableReason")) || null,
    },
  };
}

/**
 * The de-duplication key for one submitted recording.
 *
 * THE COLLISION THIS FIXES. `takeId` used to be a constant filename
 * ("speaking.m4a"), which made the whole key a pure function of the duration
 * rounded to a whole second. The recorder ticks in exact one-second steps, so
 * two practice attempts that happened to run the same length — 60s, 90s and
 * 120s being the obvious attractors — produced IDENTICAL keys, and the second
 * submission was answered from the first one's cached response: a different
 * recording, possibly against a different prompt, reported back with the first
 * attempt's transcript, criteria and verdict.
 *
 * `takeId` is now a UUID minted once, when the blob is produced in
 * SpeakingRecorder's onstop handler — NOT when submit is pressed. That
 * distinction is the whole point of keeping a key at all: retrying the same
 * recording after a dropped upload reuses the same id and still de-duplicates,
 * so a network failure cannot double-charge; recording again mints a new id and
 * is correctly treated as a new attempt.
 */
export async function speakingEvaluateKey(takeId: string, durationSeconds: number): Promise<string> {
  const bytes = new TextEncoder().encode(`${takeId}:${durationSeconds}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
  return `seval-${hex}`;
}

export function canSubmitSpeaking(seconds: number, min = 15): boolean {
  return seconds >= min;
}
