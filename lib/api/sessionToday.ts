import { asBool, asNumber, asString, isRecord } from "./decode";
import type { ProLock, SessionToday, SessionTodayBlock } from "./types";

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

/**
 * MONETIZATION-BOUNDARY-001 — the offer that replaces a withheld field.
 *
 * The backend attaches `proLock` only when it actually withheld something, so
 * its mere presence is the signal. A Pro plan never carries one.
 *
 * All four strings must be present. A half-decoded offer would render a card
 * with a blank heading or a button with no label, which is worse than showing
 * nothing — so an incomplete payload decodes to `null` and the card simply does
 * not appear.
 */
function decodeProLock(value: unknown): ProLock | null {
  if (!isRecord(value)) return null;
  const feature = asString(value.feature);
  const title = asString(value.title);
  const body = asString(value.body);
  const cta = asString(value.cta);
  if (!feature || !title || !body || !cta) return null;
  return { feature, title, body, cta };
}

/**
 * A block the backend nulls on a Free plan.
 *
 * `isRecord(...) ? ... : {}` was the right shape when every field always
 * arrived and the only risk was a malformed payload. Since
 * MONETIZATION-BOUNDARY-001 the backend sends an explicit `null` to mean
 * "withheld", and coercing that to `{}` produced an object full of empty
 * strings — indistinguishable, to every caller, from a coaching line the
 * engine had nothing to say in. `null` keeps the distinction the backend went
 * to the trouble of making.
 */
function decodeWithheld<T>(value: unknown, decode: (record: Record<string, unknown>) => T): T | null {
  if (!isRecord(value)) return null;
  return decode(value);
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
  const session = isRecord(raw.session) ? raw.session : {};
  const difficulty = isRecord(session.difficulty) ? session.difficulty : {};
  const expected = isRecord(raw.expectedOutcome) ? raw.expectedOutcome : {};
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
      // Nulled on a Free plan: the coach's voice on today's plan is
      // `adaptive_coach`. The diagnosis above it stays free.
      coachLine: decodeWithheld(mission.coachLine, (r) => ({
        headline: asString(r.headline),
        why: asString(r.why),
        focus: asString(r.focus),
      })),
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
    // Both nulled on a Free plan. The priority ranking and its reasons, and
    // the plan restated as coaching, are the clearest expressions of
    // `adaptive_coach`.
    roi: decodeWithheld(raw.roi, (r) => {
      const best = isRecord(r.best) ? r.best : {};
      return {
        best: {
          skill: asString(best.skill),
          because: Array.isArray(best.because) ? best.because.map((x) => asString(x)).filter(Boolean) : [],
        },
      };
    }),
    coachSummary: decodeWithheld(raw.coachSummary, (r) => ({
      headline: asString(r.headline),
      body: asString(r.body),
    })),
    intelligenceSummary: {
      findings: Array.isArray(intel.findings)
        ? intel.findings.filter(isRecord).map((item) => ({
            question: asString(item.question),
            answer: asString(item.answer),
          }))
        : [],
      plannedMinutes: asNumber(intel.plannedMinutes),
    },
    // Present only when something above was withheld — it carries the offer to
    // render in its place. `undefined` rather than `null` so the field simply
    // is not there for Pro, matching the optional `proLock?` in the type.
    proLock: decodeProLock(raw.proLock) ?? undefined,
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
