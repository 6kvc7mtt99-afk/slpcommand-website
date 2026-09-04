import { describe, expect, it } from "vitest";
import { decodeSpeakingEvaluate, wasRated } from "../../lib/speaking/evaluate";

/**
 * An unjudged criterion must never render as a failed one.
 *
 * `rating.criteria` is null whenever the engine declines to rate — a too-short
 * response early-returns from rateOneTask with no `verdicts` key at all, and
 * server.js sends `criteria: rating.verdicts ?? null`. The decoder used
 * `asBool(rec.met, false)`, turning that absence into four explicit false
 * verdicts, and the result card rendered four red "Not met" chips against
 * Content, Task fulfilment, Accuracy and Text produced. A learner who had just
 * spent a metered credit was told they had failed all four STANAG criteria on
 * a recording the engine had refused to assess.
 *
 * The backend's own legacy projection maps a missing verdict to UNKNOWN, never
 * to NOT_MET — this brings the client into line with it.
 */
const base = {
  attempt_id: "sa-1",
  transcript: "…",
  target_level: "3",
  mode: "practice",
};

describe("speaking verdict truth", () => {
  it("keeps an unjudged criterion null rather than failed", () => {
    const out = decodeSpeakingEvaluate({
      ...base,
      rating: { credited: false, level_attempted: "3", criteria: null, failed_on: ["insufficient_response"] },
    })!;
    for (const k of ["content", "tasks", "accuracy", "textProduced"] as const) {
      expect(out.rating.criteria[k].met, k).toBeNull();
    }
    expect(wasRated(out.rating)).toBe(false);
  });

  it("still reports a real verdict when the engine gave one", () => {
    const out = decodeSpeakingEvaluate({
      ...base,
      rating: {
        credited: true,
        level_attempted: "3",
        criteria: {
          content: { met: true, note: "Covered." },
          tasks: { met: true, note: "" },
          accuracy: { met: false, note: "Tense slips." },
          textProduced: { met: true, note: "" },
        },
      },
    })!;
    expect(out.rating.criteria.content.met).toBe(true);
    expect(out.rating.criteria.accuracy.met).toBe(false);
    expect(wasRated(out.rating)).toBe(true);
  });

  it("distinguishes 'not judged' from 'judged and failed'", () => {
    const unjudged = decodeSpeakingEvaluate({ ...base, rating: { criteria: null } })!;
    const failed = decodeSpeakingEvaluate({
      ...base,
      rating: { criteria: { content: { met: false }, tasks: { met: false }, accuracy: { met: false }, textProduced: { met: false } } },
    })!;
    expect(wasRated(unjudged.rating)).toBe(false);
    expect(wasRated(failed.rating)).toBe(true);
  });
});
