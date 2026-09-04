import { describe, expect, it } from "vitest";
import { decodeWritingCorrection } from "../../lib/api/writing";

/**
 * The Writing evaluation contract, pinned to the shape the backend really sends.
 *
 * THE DEFECT THIS WOULD HAVE CAUGHT. `POST /api/writing/submit` responds with
 * `correction` as an OBJECT (server.js:7682, built by validateWritingCorrection
 * at server.js:8391). The decoder read it with asString(), which returns "" for
 * a non-string, so its `if (!correction) return null` guard fired on every real
 * submission — the decoder returned null 100% of the time and the learner saw
 * "The evaluation came back in a form we couldn't display" after spending a
 * metered credit and waiting through a 180s AI call.
 *
 * There was NO test over decodeWritingCorrection at all, which is exactly why
 * it survived five review phases.
 */
const REAL_ENVELOPE = {
  ok: true,
  writingAttemptId: "att-77",
  attempt: { id: "att-77" },
  correction: {
    estimatedLevel: "2",
    ceilingLevel: "3",
    levelReport: "Level 2 with emerging Level 3",
    overallBand: 62,
    taskCoverage: { value: 0.8, present: true, applied: false },
    taskAchievement: { score: 65, feedback: "The report answers the task but omits the recommendation." },
    contentAndOrganization: { score: 58, feedback: "Paragraphing is inconsistent after the second point." },
    languagePrecision: { score: 61, feedback: "Tense control slips in the past-narrative sections." },
    strengths: ["Clear opening statement"],
    weaknesses: ["Recommendation missing"],
    criticalErrors: ["Subject-verb agreement in paragraph 3"],
    recurrentErrors: ["article omission"],
    checklistMissing: ["recommendation"],
    studyRecommendations: ["Practise the SITREP recommendation section"],
    improvedVersion: "A rewritten version of the submission.",
  },
};

describe("decodeWritingCorrection", () => {
  it("decodes the real object envelope instead of rejecting it", () => {
    const out = decodeWritingCorrection(REAL_ENVELOPE);
    expect(out).not.toBeNull();
    expect(out!.writingAttemptId).toBe("att-77");
  });

  it("surfaces all three scored rubric dimensions", () => {
    const out = decodeWritingCorrection(REAL_ENVELOPE)!;
    expect(out.taskAchievement).toEqual({
      score: 65,
      feedback: "The report answers the task but omits the recommendation.",
    });
    expect(out.contentAndOrganization.score).toBe(58);
    expect(out.languagePrecision.feedback).toMatch(/Tense control/);
  });

  it("surfaces the actionable lists the learner paid for", () => {
    const out = decodeWritingCorrection(REAL_ENVELOPE)!;
    expect(out.criticalErrors).toEqual(["Subject-verb agreement in paragraph 3"]);
    expect(out.weaknesses).toEqual(["Recommendation missing"]);
    expect(out.strengths).toEqual(["Clear opening statement"]);
    expect(out.studyRecommendations).toEqual(["Practise the SITREP recommendation section"]);
  });

  /**
   * Claims registry C24 records that the product does not offer "an improved
   * version beside yours", and marketingPages.test.ts pins that phrase out of
   * the copy. The backend computes one; the web must not carry it until that
   * is a deliberate product decision.
   */
  it("does not carry improvedVersion into the client model", () => {
    const out = decodeWritingCorrection(REAL_ENVELOPE)!;
    expect(JSON.stringify(out)).not.toContain("A rewritten version");
    expect(Object.keys(out)).not.toContain("improvedVersion");
  });

  /** An unscored dimension is not a zero-scored one. */
  it("keeps an unscored dimension null rather than zero", () => {
    const out = decodeWritingCorrection({
      correction: {
        levelReport: "Level 2",
        taskAchievement: { feedback: "Addressed." },
        contentAndOrganization: {},
        languagePrecision: {},
      },
    })!;
    expect(out.taskAchievement.score).toBeNull();
    expect(out.taskAchievement.feedback).toBe("Addressed.");
  });

  it("still returns null when there is genuinely nothing to show", () => {
    expect(decodeWritingCorrection({ ok: true })).toBeNull();
    expect(decodeWritingCorrection({ correction: {} })).toBeNull();
    // The old string shape is no longer a valid evaluation.
    expect(decodeWritingCorrection({ correction: "a plain string" })).toBeNull();
  });
});
