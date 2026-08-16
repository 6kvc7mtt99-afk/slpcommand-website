import { describe, expect, it } from "vitest";
import { decodeAchievements, decodeRecent, decodeStreak } from "../../lib/api/activity";
import { decodeFeatureFlags } from "../../lib/api/featureFlags";
import { decodeProgress, displayOverallLevel, shouldShowProgressRing } from "../../lib/api/progress";
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
  it("prefers effectiveLevel and confidence_label without inventing a ring", () => {
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
      proficiencyEngine: { effectiveLevel: 2.4, sigma2: 9, weightedMean: 99, mode: "secret" },
    });
    expect(progress).not.toBeNull();
    expect(displayOverallLevel(progress!)).toBe(2.4);
    expect(progress!.skills.reading.confidence_label).toBe("Fairly reliable");
    expect(shouldShowProgressRing(progress)).toBe(true);
    expect(JSON.stringify(progress)).not.toContain("sigma2");
    expect(JSON.stringify(progress)).not.toContain("weightedMean");
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

  it("decodes achievements from several envelope shapes", () => {
    const items = decodeAchievements({ achievements: [{ name: "First session", earnedAt: "2026-08-01" }] });
    expect(items[0]?.title).toBe("First session");
  });
});
