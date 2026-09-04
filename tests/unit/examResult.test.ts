import { describe, expect, it } from "vitest";
import { decodeExamResult, examResultHeadline } from "../../lib/api/examResult";

/**
 * The exam result, pinned to both real envelopes.
 *
 * THE DEFECT THIS WOULD HAVE CAUGHT. Both exam screens did:
 *   const score = record.score ?? record.percent ?? record.result;
 *   setResult(typeof score === "string" || typeof score === "number" ? String(score) : "Submitted.");
 *
 * Reading's `score` is a RATIO, so a learner who sat a timed 20-question exam —
 * one per month on Free — saw the bare string "0.65" next to SLP language.
 * Listening sends no `score` key at all, so it ALWAYS fell through to the
 * literal word "Submitted.", discarding the REDS rating, the indicated level
 * and the correct/total the backend had already computed and persisted.
 *
 * Neither path had any test, and the e2e mock has no exam finish handler at
 * all, so nothing exercised the result screen.
 */
const READING = {
  examId: "ex-1",
  total: 20,
  answered: 20,
  unanswered: 0,
  correct: 13,
  score: 0.65,
  percentage: 65,
  passed: true,
  estimatedSlpLevel: "2",
  level2Correct: 8,
  level2Total: 10,
};

const LISTENING = {
  ok: true,
  examSessionId: "ls-1",
  totalQuestions: 20,
  correctAnswers: 14,
  percentage: 70,
  estimatedSlpLevel: "3",
  reds: "Sustained at Level 3",
};

describe("decodeExamResult", () => {
  it("reads the Reading envelope without printing a bare ratio", () => {
    const r = decodeExamResult(READING)!;
    expect(r.percentage).toBe(65);
    expect(r.correct).toBe(13);
    expect(r.total).toBe(20);
    expect(r.passed).toBe(true);
    expect(r.estimatedSlpLevel).toBe("2");
    expect(examResultHeadline(r)).toBe("13 of 20 correct");
  });

  it("reads the Listening envelope, which has no score key at all", () => {
    const r = decodeExamResult(LISTENING)!;
    expect(r.percentage).toBe(70);
    expect(r.correct).toBe(14);
    expect(r.total).toBe(20);
    expect(r.reds).toBe("Sustained at Level 3");
    expect(r.estimatedSlpLevel).toBe("3");
    expect(examResultHeadline(r)).toBe("14 of 20 correct");
  });

  /** A ratio must become a percentage, never a displayed "0.65". */
  it("converts a bare ratio to a percentage", () => {
    expect(decodeExamResult({ score: 0.65 })!.percentage).toBe(65);
    expect(decodeExamResult({ percentage: 65 })!.percentage).toBe(65);
  });

  /** The learner-facing scale is 2 and 3; a plus-band reports as its floor. */
  it("never surfaces a plus-band level", () => {
    expect(decodeExamResult({ estimatedSlpLevel: "2+" })!.estimatedSlpLevel).toBe("2");
  });

  /** An absent verdict is not a failure. */
  it("keeps an unstated verdict null rather than false", () => {
    expect(decodeExamResult({ correct: 1, total: 2 })!.passed).toBeNull();
    expect(decodeExamResult({ passed: false })!.passed).toBe(false);
  });

  it("returns null only when nothing measurable came back", () => {
    expect(decodeExamResult({ ok: true, examId: "x" })).toBeNull();
    expect(decodeExamResult(null)).toBeNull();
  });
});
