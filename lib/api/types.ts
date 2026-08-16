/** Display DTOs. Backend wire names. Extra keys are ignored, never computed. */

export type SkillName = "reading" | "listening" | "writing" | "speaking";

export type SessionPosture = "recovering" | "building" | "advancing" | "maintaining" | "onboarding";

export type SessionDifficultyLevel = "easy" | "balanced" | "intensive" | "none";

export type SessionTodayBlock = {
  skill: string;
  minutes: number;
  posture: string;
  why: string;
  focus: string;
  academyFocus: string | null;
};

export type SessionToday = {
  version: string;
  generatedAt: string;
  generationMs: number;
  mission: {
    headline: string;
    reason: string;
    coachLine: { headline: string; why: string; focus: string };
  };
  session: {
    blocks: SessionTodayBlock[];
    estimatedMinutes: number;
    requestedMinutes: number;
    difficulty: { level: string; minutes: number; productiveShare: number; why: string };
    skillsCovered: string[];
    skillsSkipped: Array<{ skill: string; why: string }>;
  };
  expectedOutcome: {
    certainties: Array<{ skill: string; text: string }>;
    projections: Array<{ skill: string; text: string }>;
    confidenceRecovery: Array<{
      skill: string;
      from: string;
      to: string;
      minutes: number;
      certain: boolean;
    }>;
    passProbability: null;
    passProbabilityWhy: string;
  };
  roi: { best: { skill: string; because: string[] } };
  coachSummary: { headline: string; body: string };
  intelligenceSummary: { findings: Array<{ question: string; answer: string }>; plannedMinutes: number };
};

export type ProgressSkill = {
  level: string | number | null;
  confidence: string;
  available: boolean;
  stale: boolean;
  evidence: { count: number; unit: string };
  confidence_label: string;
  confidence_explanation: Record<string, unknown>;
  confidence_scale: Record<string, unknown>;
};

export type ProgressResponse = {
  overall: { level: string | number | null; confidence: string; available: boolean };
  skills: {
    reading: ProgressSkill;
    listening: ProgressSkill;
    writing: ProgressSkill;
    speaking: ProgressSkill;
  };
  targetLevel: string;
  totalExercises: number;
  lastUpdated: string;
  proficiencyEngine: { effectiveLevel: string | number | null };
  proficiencyOverall: {
    available: boolean;
    level: string | number | null;
    band: string | null;
    confidence: string;
    coverage: number;
    skillsAvailable: string[];
  };
  proficiencyTransition: { noticeable: boolean; notice: string | null };
};

export type EntitlementsResponse = {
  ok: boolean;
  plan: {
    key: string;
    name: string;
    description: string;
    source: string;
    startedAt: string;
    expiresAt: string | null;
  } | null;
  features: Array<{
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    quota: { period: string; limit: number | null; remaining: number | null } | null;
  }>;
};

export type FeatureFlags = {
  reading_enabled: boolean;
  listening_enabled: boolean;
  writing_enabled: boolean;
  speaking_enabled: boolean;
  academy_enabled: boolean;
  home_v3_enabled: boolean;
};

export type StreakSnapshot = {
  current: number | null;
  longest: number | null;
  timezone: string;
};

export type AchievementItem = {
  id: string;
  title: string;
  earnedAt: string | null;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  skill: string;
  at: string | null;
};

export const HOME_V2_SSR_PATHS = [
  "/api/feature-flags",
  "/api/entitlements",
  "/api/progress",
  "/api/session/today",
  "/api/activity/streak",
] as const;

export const HOME_V2_LAZY_PATHS = ["/api/activity/achievements", "/api/activity/recent"] as const;

export const HOME_V2_FORBIDDEN_PATHS = ["/api/learning/home", "/api/speaking/coach/mission"] as const;

export const TODAY_INVALIDATION_PATHS = [
  "/api/reading/answer",
  "/api/reading/exam/finish",
  "/api/listening/slp/answer",
  "/api/listening/slp/exam/finish",
  "/api/writing/submit",
  "/api/speaking/evaluate",
] as const;
