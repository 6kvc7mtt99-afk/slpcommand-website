import { asBool, asLevel, asNumber, asString, isRecord, pickAlias } from "./decode";
import type { ProgressResponse, ProgressSkill } from "./types";

const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

function emptySkill(): ProgressSkill {
  return {
    level: null,
    confidence: "",
    available: false,
    stale: false,
    evidence: { count: 0, unit: "" },
    confidence_label: "",
    confidence_explanation: {},
    confidence_scale: {},
  };
}

function asScale(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function decodeSkill(value: unknown): ProgressSkill {
  if (!isRecord(value)) return emptySkill();
  const evidence = isRecord(value.evidence) ? value.evidence : {};
  return {
    level: asLevel(value.level),
    confidence: asString(value.confidence),
    available: asBool(value.available),
    stale: asBool(value.stale),
    evidence: {
      count: asNumber(evidence.count),
      unit: asString(evidence.unit),
    },
    confidence_label: asString(pickAlias(value, "confidence_label", "confidenceLabel")),
    confidence_explanation: asScale(pickAlias(value, "confidence_explanation", "confidenceExplanation")),
    confidence_scale: asScale(pickAlias(value, "confidence_scale", "confidenceScale")),
  };
}

export function decodeProgress(raw: unknown): ProgressResponse | null {
  if (!isRecord(raw)) return null;
  const overall = isRecord(raw.overall) ? raw.overall : {};
  const skillsRaw = isRecord(raw.skills) ? raw.skills : {};
  const engine = isRecord(raw.proficiencyEngine) ? raw.proficiencyEngine : {};
  const overallProf = isRecord(raw.proficiencyOverall) ? raw.proficiencyOverall : {};
  const transition = isRecord(raw.proficiencyTransition) ? raw.proficiencyTransition : {};

  return {
    overall: {
      level: asLevel(overall.level),
      confidence: asString(overall.confidence),
      available: asBool(overall.available),
    },
    skills: {
      reading: decodeSkill(skillsRaw.reading),
      listening: decodeSkill(skillsRaw.listening),
      writing: decodeSkill(skillsRaw.writing),
      speaking: decodeSkill(skillsRaw.speaking),
    },
    targetLevel: asString(raw.targetLevel),
    totalExercises: asNumber(raw.totalExercises),
    lastUpdated: asString(raw.lastUpdated),
    proficiencyEngine: {
      effectiveLevel: asLevel(engine.effectiveLevel),
    },
    proficiencyOverall: {
      available: asBool(overallProf.available),
      level: asLevel(overallProf.level),
      band: overallProf.band == null ? null : asString(overallProf.band),
      confidence: asString(overallProf.confidence),
      coverage: asNumber(overallProf.coverage),
      skillsAvailable: Array.isArray(overallProf.skillsAvailable)
        ? overallProf.skillsAvailable.map((s) => asString(s)).filter(Boolean)
        : [],
    },
    proficiencyTransition: {
      noticeable: asBool(transition.noticeable),
      notice: decodeTransitionNotice(transition.notice),
      coach: decodeTransitionCoach(transition.coach),
    },
  };
}

function decodeTransitionNotice(raw: unknown): { title: string; body: string; action: string } | null {
  if (!isRecord(raw)) return null;
  const title = asString(raw.title);
  const body = asString(raw.body);
  if (!title && !body) return null;
  return { title, body, action: asString(raw.action) };
}

function decodeTransitionCoach(raw: unknown): { whyChanged: string; whatNow: string; howToRaise: string } | null {
  if (!isRecord(raw)) return null;
  const whyChanged = asString(raw.whyChanged);
  const whatNow = asString(raw.whatNow);
  const howToRaise = asString(raw.howToRaise);
  if (!whyChanged && !whatNow && !howToRaise) return null;
  return { whyChanged, whatNow, howToRaise };
}

export function displaySkillLevel(skill: ProgressSkill, effectiveLevel: string | number | null): string | number | null {
  if (effectiveLevel != null) return effectiveLevel;
  return skill.level;
}

/**
 * The learner's ALL-SKILLS level.
 *
 * THE TRUTH BUG THIS FIXES. This preferred `proficiencyEngine.effectiveLevel`,
 * which is not a cross-skill figure at all: the backend assigns
 * `body.proficiencyEngine = readingBlock` (server.js:15743) and gives the other
 * three skills their own separate keys — proficiencyEngineListening,
 * proficiencyEngineWriting, proficiencyEngineSpeaking. So the number was
 * READING ALONE, and both surfaces that render it label it as everything:
 * HomeDashboard prints "SLP {overall}" beside "estimated · all skills" and
 * feeds the same value to the readiness instrument's centre dial, while
 * /progress says "You are at SLP {overall}." A learner strong at Reading and
 * weak at Speaking was told their overall SLP was their Reading SLP.
 *
 * `proficiencyOverall` is the field that actually answers the question. The
 * backend builds it from all four skills through `resolveOverallProficiency`,
 * falling back to each skill's legacy level where the V2 engine has no block,
 * and caps its confidence at the weakest per-skill tier so the headline can
 * never look fresher than its stalest component (server.js, OVERALL-
 * PROFICIENCY-001). It has been decoded here since it shipped and rendered by
 * nothing.
 *
 * Order: the real cross-skill projection, then the legacy overall, and never
 * the Reading-only engine — choosing a different server field, not inventing a
 * local calculation.
 */
/**
 * A level of zero is not a measurement.
 *
 * Zero is not on this scale: the backend's own overall projection declares a
 * minimum of 1.0, and learners are only ever shown 2 and 3. It reached the UI
 * because "attempts exist but none credited" produced `level: 0` with
 * `available: true`, and every null-guard let it through since 0 !== null. The
 * readiness instrument already applies exactly this rule (it skips a ring for
 * `raw <= 0`), so without it one screen printed "SLP 0" in the legend beside a
 * ring it had deliberately omitted. Fixed at the source too; this is the
 * belt-and-braces so no future producer can reintroduce it.
 */
export function isMeasuredLevel(level: unknown): boolean {
  const n = typeof level === "number" ? level : Number(level);
  return Number.isFinite(n) && n > 0;
}

export function displayOverallLevel(progress: ProgressResponse): string | number | null {
  if (progress.proficiencyOverall.available && progress.proficiencyOverall.level != null) {
    return formatSlpLevel(progress.proficiencyOverall.level);
  }
  return formatSlpLevel(progress.overall.level);
}

/**
 * One decimal, everywhere, for every SLP level shown to a learner.
 *
 * `proficiencyOverall.level` is `Number(level.toFixed(4))` on the backend
 * (proficiencyOverall.js) — four decimals kept for observability and test
 * determinism, not for display. Rendering it verbatim printed "SLP 2.3167" on
 * the Home hero, the instrument's centre dial and the /progress headline: a
 * precision-weighted mean of four noisy per-skill estimates does not support
 * one ten-thousandth of an SLP level, and claiming it undermines every honest
 * number beside it.
 *
 * It also made the apparent precision depend on which branch fired — the
 * legacy fallback is already rounded to 2dp server-side — so the same learner
 * could see two differently-shaped claims about the same thing.
 */
export function formatSlpLevel(level: string | number | null): string | number | null {
  if (level == null) return null;
  const n = typeof level === "number" ? level : Number(level);
  if (!Number.isFinite(n)) return level;
  return Number(n.toFixed(1));
}

/**
 * How many of the four skills the overall figure actually rests on.
 *
 * Returned so a surface can qualify the headline honestly rather than implying
 * all four are measured. Empty when the backend did not say.
 */
export function overallSkillsMeasured(progress: ProgressResponse): string[] {
  return progress.proficiencyOverall.available ? progress.proficiencyOverall.skillsAvailable : [];
}

export function shouldShowProgressRing(progress: ProgressResponse | null): boolean {
  if (!progress) return false;
  if (!progress.overall.available && !progress.proficiencyOverall.available) return false;
  return displayOverallLevel(progress) != null;
}

export function firstConfidenceScale(progress: ProgressResponse): Record<string, unknown> {
  for (const key of SKILLS) {
    const scale = progress.skills[key].confidence_scale;
    if (Object.keys(scale).length > 0) return scale;
  }
  return {};
}

/**
 * `confidence_scale` is typed `Record<string, unknown>` because the backend
 * never published a shape for it — which is why the UI that read it fell back
 * to `Object.entries(scale).map(([key, value]) => <dt>{key}</dt>)`. Verified
 * against a real account on the deployed preview, that rendered the raw
 * field names as labels: "currentId", "currentKind", "position", "steps"
 * (blank — it's an array, and the old code only printed strings/numbers).
 *
 * This reads the specific fields the real payload carries and returns the two
 * that are actually meant for a reader: the label ("Reliable") with its place
 * on the scale, and the sentence that explains it. `currentId` / `currentKind`
 * are internal and dropped. Every field is read defensively — if the backend
 * changes shape, this returns null and the card stops rendering rather than
 * guessing.
 */
export type ConfidencePosition = {
  label: string;
  meaning: string;
  position: number | null;
  total: number | null;
};

export function readConfidencePosition(scale: Record<string, unknown>): ConfidencePosition | null {
  const label = scale.currentLabel;
  if (typeof label !== "string" || !label) return null;
  const meaning = typeof scale.currentMeaning === "string" ? scale.currentMeaning : "";
  const position = typeof scale.position === "number" ? scale.position : null;
  const total = typeof scale.total === "number" ? scale.total : null;
  return { label, meaning, position, total };
}
