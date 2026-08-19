import { describe, expect, it } from "vitest";
import { decodeProgress } from "../../lib/api/progress";

/**
 * Verified against the real backend on the deployed preview via an
 * authenticated GET /api/backend/progress: `proficiencyTransition.notice` is
 * an object ({kind, title, body, action, dismissible}), and there is a
 * separate `coach` object (whyChanged/whatNow/howToRaise/confidenceNote).
 * The old type declared `notice: string | null`, so `asString()` on the
 * object silently returned "", TransitionBanner's `!notice` guard hid it on
 * every account, and `coach` was never read at all — the one place the real
 * response already answers "what changed, why, what to do next" was
 * discarded before a component ever saw it. This is the trimmed real
 * payload, not a fabricated one.
 */
const REAL_TRANSITION_RESPONSE = {
  overall: { level: 1.63, confidence: "high", available: true },
  skills: {
    reading: { level: 3.3, confidence: "high", available: true },
    listening: { level: 1, confidence: "high", available: true },
    writing: { level: 2, confidence: "high", available: true },
    speaking: { level: 0, confidence: "high", available: true },
  },
  targetLevel: "3",
  totalExercises: 170,
  proficiencyEngine: { effectiveLevel: 1.5 },
  proficiencyOverall: { available: true },
  proficiencyTransition: {
    phase: "switched",
    delta: -1.8,
    noticeable: true,
    displayLevel: 1.5,
    previewLevel: null,
    notice: {
      kind: "switched",
      title: "Your Reading estimate has been updated",
      body: "Your reading level is now 1.5, where before it showed 3.3. Nothing about your English has changed — we corrected how the estimate is worked out.",
      action: "See what this is based on",
      dismissible: true,
    },
    history: { allowTrendAcross: false },
    coach: {
      whyChanged: "Your estimate went down because we corrected how it is worked out, not because your English did.",
      whatNow: "Nothing you did caused this, and nothing is lost. Work at the level shown and it will move as your answers move.",
      howToRaise: "Answer questions at the level you are aiming for.",
      confidenceNote: "A recent session is what keeps the estimate trustworthy.",
    },
  },
};

describe("progress transition decoding", () => {
  it("decodes the real notice object instead of collapsing it to an empty string", () => {
    const progress = decodeProgress(REAL_TRANSITION_RESPONSE);
    expect(progress?.proficiencyTransition.noticeable).toBe(true);
    expect(progress?.proficiencyTransition.notice).not.toBeNull();
    expect(progress?.proficiencyTransition.notice?.title).toBe("Your Reading estimate has been updated");
    expect(progress?.proficiencyTransition.notice?.body).toContain("Nothing about your English has changed");
  });

  it("decodes the coach guidance the old decoder never attempted to read", () => {
    const progress = decodeProgress(REAL_TRANSITION_RESPONSE);
    expect(progress?.proficiencyTransition.coach).not.toBeNull();
    expect(progress?.proficiencyTransition.coach?.whyChanged).toContain("we corrected how it is worked out");
    expect(progress?.proficiencyTransition.coach?.whatNow).toContain("Nothing you did caused this");
  });

  it("returns null (not a stringified object) when notice is absent", () => {
    const progress = decodeProgress({
      ...REAL_TRANSITION_RESPONSE,
      proficiencyTransition: { noticeable: false, notice: null, coach: null },
    });
    expect(progress?.proficiencyTransition.notice).toBeNull();
    expect(progress?.proficiencyTransition.coach).toBeNull();
  });
});
