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

export function displayOverallLevel(progress: ProgressResponse): string | number | null {
  if (progress.proficiencyEngine.effectiveLevel != null) return progress.proficiencyEngine.effectiveLevel;
  return progress.overall.level;
}

export function shouldShowProgressRing(progress: ProgressResponse | null): boolean {
  if (!progress) return false;
  if (!progress.overall.available && progress.proficiencyEngine.effectiveLevel == null) return false;
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
