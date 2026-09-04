import { describe, expect, it } from "vitest";
import { decodeAchievements, decodeRecent, decodeStreak } from "../../lib/api/activity";
import { decodeFeatureFlags } from "../../lib/api/featureFlags";
import { decodeProgress, displayOverallLevel,
  overallSkillsMeasured, shouldShowProgressRing } from "../../lib/api/progress";
import {
  clampSessionMinutes,
  decodeSessionToday,
  hasSession,
  shouldInvalidateToday,
} from "../../lib/api/sessionToday";
import {
  HOME_V2_FORBIDDEN_PATHS,
  HOME_V2_LAZY_PATHS,
  HOME_V2_SSR_PATHS,
} from "../../lib/api/types";

const fixtureToday = {
  version: "session-today/1.0.0",
  generatedAt: "2026-08-16T08:00:00.000Z",
  generationMs: 42,
  extraIgnored: true,
  mission: {
    headline: "Recover listening",
    reason: "Yesterday slipped.",
    coachLine: { headline: "Short clips", why: "Accuracy first", focus: "gist" },
  },
  session: {
    blocks: [
      {
        skill: "listening",
        minutes: 25,
        posture: "recovering",
        why: "Accuracy dipped",
        focus: "gist",
        academyFocus: "literal extraction",
      },
    ],
    estimatedMinutes: 25,
    requestedMinutes: 25,
    difficulty: { level: "balanced", minutes: 25, productiveShare: 0.8, why: "Enough time" },
    skillsCovered: ["listening"],
    skillsSkipped: [{ skill: "speaking", why: "Not in this session" }],
  },
  expectedOutcome: {
    certainties: [{ skill: "listening", text: "You will hear one more clip." }],
    projections: [{ skill: "listening", text: "Confidence may recover." }],
    confidenceRecovery: [],
    passProbability: 0.72,
    passProbabilityWhy: "Ignore me",
  },
};

describe("Home v2 fetch budget", () => {
  it("is 5 SSR + 0 hydrate echo + 2 lazy, and never calls v3 or coach/mission", () => {
    expect(HOME_V2_SSR_PATHS).toHaveLength(5);
    expect(HOME_V2_LAZY_PATHS).toHaveLength(2);
    expect(HOME_V2_FORBIDDEN_PATHS).toEqual(["/api/learning/home", "/api/speaking/coach/mission"]);
  });
});

describe("session today adapter", () => {
  it("decodes display fields and always nulls passProbability", () => {
    const today = decodeSessionToday(fixtureToday);
    expect(today).not.toBeNull();
    expect(today?.mission.headline).toBe("Recover listening");
    expect(today?.session.blocks[0]?.posture).toBe("recovering");
    expect(today?.session.blocks[0]?.academyFocus).toBe("literal extraction");
    expect(today?.expectedOutcome.passProbability).toBeNull();
    expect(today?.generationMs).toBe(42);
    expect(hasSession(today)).toBe(true);
  });

  it("hides the mission card when blocks are empty", () => {
    const today = decodeSessionToday({ session: { blocks: [] } });
    expect(hasSession(today)).toBe(false);
  });

  it("clamps minutes to 5–120 and defaults to 25", () => {
    expect(clampSessionMinutes(25)).toBe(25);
    expect(clampSessionMinutes(1)).toBe(5);
    expect(clampSessionMinutes(400)).toBe(120);
    expect(clampSessionMinutes("nope")).toBe(25);
  });

  it("invalidates today only after evidence writes", () => {
    expect(shouldInvalidateToday("/api/reading/answer")).toBe(true);
    expect(shouldInvalidateToday("/api/writing/submit")).toBe(true);
    expect(shouldInvalidateToday("/api/progress")).toBe(false);
    expect(shouldInvalidateToday("/api/speaking/coach/mission")).toBe(false);
  });
});

describe("progress adapter", () => {
  /**
   * The headline level must be the ALL-SKILLS figure, not Reading's.
   *
   * This test previously asserted the opposite — that displayOverallLevel
   * "prefers effectiveLevel" — and so pinned a truth bug in place. The backend
   * assigns `body.proficiencyEngine = readingBlock` (server.js:15743) and gives
   * the other three skills their own keys, so effectiveLevel is READING ALONE
   * while HomeDashboard and /progress both label the value "all skills".
   * `proficiencyOverall` is the real cross-skill projection.
   */
  it("uses the all-skills projection, never Reading's own engine", () => {
    const progress = decodeProgress({
      overall: { level: 2.1, confidence: "medium", available: true },
      skills: {
        reading: {
          level: 2.0,
          available: true,
          confidence_label: "Fairly reliable",
          confidenceLabel: "ignored alias",
        },
      },
      // Reading alone says 2.4; all four skills together say 2.2.
      proficiencyEngine: { effectiveLevel: 2.4, sigma2: 9, weightedMean: 99, mode: "secret" },
      proficiencyOverall: {
        available: true,
        level: 2.2,
        band: "2",
        confidence: "medium",
        coverage: 0.75,
        skillsAvailable: ["reading", "listening", "writing"],
      },
    });
    expect(progress).not.toBeNull();
    expect(displayOverallLevel(progress!)).toBe(2.2);
    expect(displayOverallLevel(progress!)).not.toBe(2.4);
    expect(overallSkillsMeasured(progress!)).toEqual(["reading", "listening", "writing"]);
    expect(progress!.skills.reading.confidence_label).toBe("Fairly reliable");
    expect(shouldShowProgressRing(progress)).toBe(true);
    // Internal engine state must never reach the client payload.
    expect(JSON.stringify(progress)).not.toContain("sigma2");
    expect(JSON.stringify(progress)).not.toContain("weightedMean");
  });

  /** Without the cross-skill block, fall back to the legacy overall — still not Reading's engine. */
  it("falls back to the legacy overall, not to the Reading engine", () => {
    const progress = decodeProgress({
      overall: { level: 2.1, confidence: "medium", available: true },
      skills: { reading: { level: 2.0, available: true } },
      proficiencyEngine: { effectiveLevel: 2.4 },
    });
    expect(displayOverallLevel(progress!)).toBe(2.1);
    expect(overallSkillsMeasured(progress!)).toEqual([]);
  });

  it("hides the ring when progress is missing or unavailable without a level", () => {
    expect(shouldShowProgressRing(null)).toBe(false);
    expect(
      shouldShowProgressRing(
        decodeProgress({
          overall: { level: null, available: false, confidence: "none" },
          skills: {},
        }),
      ),
    ).toBe(false);
  });

  it("accepts camelCase confidence aliases", () => {
    const progress = decodeProgress({
      overall: { available: true, level: 3 },
      skills: { writing: { available: true, confidenceLabel: "Limited evidence", confidenceScale: { low: "Limited" } } },
    });
    expect(progress?.skills.writing.confidence_label).toBe("Limited evidence");
    expect(progress?.skills.writing.confidence_scale).toEqual({ low: "Limited" });
  });
});

describe("feature flags", () => {
  it("fails open for module flags and fail-closes home v3 when absent", () => {
    const flags = decodeFeatureFlags({});
    expect(flags.reading_enabled).toBe(true);
    expect(flags.listening_enabled).toBe(true);
    expect(flags.writing_enabled).toBe(true);
    expect(flags.speaking_enabled).toBe(true);
    expect(flags.academy_enabled).toBe(true);
    expect(flags.home_v3_enabled).toBe(false);
  });

  it("honours an explicit home_v3_enabled without turning the dashboard into v3", () => {
    const flags = decodeFeatureFlags({ flags: { home_v3_enabled: true, reading_enabled: false } });
    expect(flags.home_v3_enabled).toBe(true);
    expect(flags.reading_enabled).toBe(false);
  });
});

describe("activity adapters", () => {
  it("decodes streak aliases and hides nothing when numbers exist", () => {
    expect(decodeStreak({ currentStreak: 4, longestStreak: 10 }, "UTC")).toEqual({
      current: 4,
      longest: 10,
      timezone: "UTC",
    });
  });

  it("keeps recent activity to five verbatim titles", () => {
    const recent = decodeRecent({
      items: Array.from({ length: 8 }, (_, i) => ({ title: `Item ${i + 1}`, skill: "reading" })),
    });
    expect(recent).toHaveLength(5);
    expect(recent[0]?.title).toBe("Item 1");
  });

  /**
   * The envelope `GET /api/activity/recent` actually returns.
   *
   * The fixture above is hand-written and uses `title`, which the endpoint
   * never sends — that is why the decoder could ask for the wrong field names
   * and still pass. This pins the real shape, so the list can never silently
   * empty itself again.
   */
  it("decodes the real /activity/recent envelope (displayTitle, activityId)", () => {
    const recent = decodeRecent({
      items: [
        {
          activityId: "evt-1",
          activityType: "practice",
          skill: "listening",
          occurredAt: "2026-09-02T10:00:00.000Z",
          activityDate: "2026-09-02",
          displayTitle: "Listening practice",
          sourceType: "listening_attempt",
          isAcademy: false,
          isExam: false,
        },
      ],
    });
    expect(recent).toHaveLength(1);
    expect(recent[0]?.title).toBe("Listening practice");
    expect(recent[0]?.id).toBe("evt-1");
    expect(recent[0]?.skill).toBe("listening");
    expect(recent[0]?.at).toBe("2026-09-02T10:00:00.000Z");
  });

  it("decodes achievements from several envelope shapes", () => {
    const items = decodeAchievements({ achievements: [{ name: "First session", earnedAt: "2026-08-01" }] });
    expect(items[0]?.title).toBe("First session");
  });
});
