import { asBool, asNumber, asString, isRecord } from "./decode";
import type { SessionToday, SessionTodayBlock } from "./types";

export const DEFAULT_SESSION_MINUTES = 25;
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 120;

export function clampSessionMinutes(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SESSION_MINUTES;
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(n)));
}

function decodeBlock(value: unknown): SessionTodayBlock | null {
  if (!isRecord(value)) return null;
  return {
    skill: asString(value.skill),
    minutes: asNumber(value.minutes),
    posture: asString(value.posture),
    why: asString(value.why),
    focus: asString(value.focus),
    academyFocus: value.academyFocus == null ? null : asString(value.academyFocus),
  };
}

function decodePairs(value: unknown, a: string, b: string): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    [a]: asString(item[a]),
    [b]: asString(item[b]),
  }));
}

export function decodeSessionToday(raw: unknown): SessionToday | null {
  if (!isRecord(raw)) return null;
  const mission = isRecord(raw.mission) ? raw.mission : {};
  const coachLine = isRecord(mission.coachLine) ? mission.coachLine : {};
  const session = isRecord(raw.session) ? raw.session : {};
  const difficulty = isRecord(session.difficulty) ? session.difficulty : {};
  const expected = isRecord(raw.expectedOutcome) ? raw.expectedOutcome : {};
  const roi = isRecord(raw.roi) ? raw.roi : {};
  const roiBest = isRecord(roi.best) ? roi.best : {};
  const coachSummary = isRecord(raw.coachSummary) ? raw.coachSummary : {};
  const intel = isRecord(raw.intelligenceSummary) ? raw.intelligenceSummary : {};

  const blocks = Array.isArray(session.blocks)
    ? session.blocks.map(decodeBlock).filter((b): b is SessionTodayBlock => b != null)
    : [];

  return {
    version: asString(raw.version),
    generatedAt: asString(raw.generatedAt),
    generationMs: asNumber(raw.generationMs),
    mission: {
      headline: asString(mission.headline),
      reason: asString(mission.reason),
      coachLine: {
        headline: asString(coachLine.headline),
        why: asString(coachLine.why),
        focus: asString(coachLine.focus),
      },
    },
    session: {
      blocks,
      estimatedMinutes: asNumber(session.estimatedMinutes),
      requestedMinutes: asNumber(session.requestedMinutes, DEFAULT_SESSION_MINUTES),
      difficulty: {
        level: asString(difficulty.level),
        minutes: asNumber(difficulty.minutes),
        productiveShare: asNumber(difficulty.productiveShare),
        why: asString(difficulty.why),
      },
      skillsCovered: Array.isArray(session.skillsCovered)
        ? session.skillsCovered.map((s) => asString(s)).filter(Boolean)
        : [],
      skillsSkipped: Array.isArray(session.skillsSkipped)
        ? session.skillsSkipped.filter(isRecord).map((item) => ({
            skill: asString(item.skill),
            why: asString(item.why),
          }))
        : [],
    },
    expectedOutcome: {
      certainties: decodePairs(expected.certainties, "skill", "text") as Array<{
        skill: string;
        text: string;
      }>,
      projections: decodePairs(expected.projections, "skill", "text") as Array<{
        skill: string;
        text: string;
      }>,
      confidenceRecovery: Array.isArray(expected.confidenceRecovery)
        ? expected.confidenceRecovery.filter(isRecord).map((item) => ({
            skill: asString(item.skill),
            from: asString(item.from),
            to: asString(item.to),
            minutes: asNumber(item.minutes),
            certain: asBool(item.certain),
          }))
        : [],
      passProbability: null,
      passProbabilityWhy: asString(expected.passProbabilityWhy, "Not calibrated."),
    },
    roi: {
      best: {
        skill: asString(roiBest.skill),
        because: Array.isArray(roiBest.because) ? roiBest.because.map((x) => asString(x)).filter(Boolean) : [],
      },
    },
    coachSummary: {
      headline: asString(coachSummary.headline),
      body: asString(coachSummary.body),
    },
    intelligenceSummary: {
      findings: Array.isArray(intel.findings)
        ? intel.findings.filter(isRecord).map((item) => ({
            question: asString(item.question),
            answer: asString(item.answer),
          }))
        : [],
      plannedMinutes: asNumber(intel.plannedMinutes),
    },
  };
}

export function hasSession(today: SessionToday | null): boolean {
  return !!today && today.session.blocks.length > 0;
}

export function shouldInvalidateToday(path: string): boolean {
  const normalized = path.split("?")[0] ?? path;
  return (
    normalized === "/api/reading/answer" ||
    normalized === "/api/reading/exam/finish" ||
    normalized === "/api/listening/slp/answer" ||
    normalized === "/api/listening/slp/exam/finish" ||
    normalized === "/api/writing/submit" ||
    normalized === "/api/speaking/evaluate"
  );
}
