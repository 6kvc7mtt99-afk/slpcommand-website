import { asNumber, asString, isRecord, pickAlias } from "./decode";

/**
 * What a finished exam actually produced.
 *
 * THE BUG THIS FIXES. Both exam screens threw the entire result away. Each did:
 *
 *     const score = record.score ?? record.percent ?? record.result;
 *     setResult(typeof score === "string" || typeof score === "number"
 *       ? String(score) : "Submitted.");
 *
 * Reading's `score` is a RATIO, so a learner who sat a timed 20-question exam —
 * one of one per month on Free — was shown the bare string "0.65" beside SLP
 * language, with no label, no denominator and no idea whether that was good.
 * Listening does not send a `score` key at all, so its screen always fell
 * through to the literal word "Submitted." — the REDS rating, the level and the
 * correct/total were computed, persisted, and never once displayed.
 *
 * Everything below is a field the backend already returns:
 *   Reading  (server.js /api/reading/exam/finish): total, answered, unanswered,
 *            correct, score, percentage, passed, estimatedSlpLevel, and a
 *            level2/level3 breakdown.
 *   Listening (server.js /api/listening/slp/exam/finish): totalQuestions,
 *            correctAnswers, percentage, estimatedSlpLevel, reds.
 *
 * Nothing here is computed in the browser except the percentage fallback, and
 * that only when the backend sent a ratio and no percentage of its own.
 */
export type ExamResult = {
  /** 0-100. null when the backend sent neither a percentage nor a ratio. */
  percentage: number | null;
  correct: number | null;
  total: number | null;
  /** The backend's own verdict. null when it did not state one. */
  passed: boolean | null;
  /** Only ever what the backend measured — never derived here. */
  estimatedSlpLevel: string | null;
  /** Listening's criterion-referenced rating, when present. */
  reds: string | null;
};

function levelOf(value: unknown): string | null {
  const s = asString(value).trim();
  if (!s) return null;
  // The learner-facing scale is 2 and 3. A plus-band is a real STANAG value but
  // is not part of this product's vocabulary, so it is reported as its floor
  // rather than shown verbatim or silently promoted.
  return s.replace(/\+$/, "");
}

export function decodeExamResult(raw: unknown): ExamResult | null {
  if (!isRecord(raw)) return null;

  const total = pickAlias(raw, "total", "totalQuestions");
  const correct = pickAlias(raw, "correct", "correctAnswers");
  const pct = pickAlias(raw, "percentage");
  const ratio = pickAlias(raw, "score");

  let percentage: number | null = null;
  if (typeof pct === "number" && Number.isFinite(pct)) {
    percentage = Math.round(pct);
  } else if (typeof ratio === "number" && Number.isFinite(ratio)) {
    // Reading sends a 0-1 ratio here; presenting it verbatim is what produced
    // the bare "0.65".
    percentage = Math.round(ratio <= 1 ? ratio * 100 : ratio);
  }

  const passedRaw = pickAlias(raw, "passed");
  const result: ExamResult = {
    percentage,
    correct: typeof correct === "number" && Number.isFinite(correct) ? correct : null,
    total: typeof total === "number" && Number.isFinite(total) ? total : null,
    passed: typeof passedRaw === "boolean" ? passedRaw : null,
    estimatedSlpLevel: levelOf(pickAlias(raw, "estimatedSlpLevel", "estimated_slp_level")),
    reds: asString(pickAlias(raw, "reds", "reds_result")) || null,
  };

  // Nothing measurable came back — the caller keeps its honest fallback.
  const empty =
    result.percentage == null &&
    result.correct == null &&
    result.passed == null &&
    result.estimatedSlpLevel == null &&
    result.reds == null;
  return empty ? null : result;
}

/** A one-line summary using only what the backend supplied. */
export function examResultHeadline(r: ExamResult): string {
  if (r.correct != null && r.total != null) return `${r.correct} of ${r.total} correct`;
  if (r.percentage != null) return `${r.percentage}% correct`;
  return "Submitted";
}

void asNumber;
