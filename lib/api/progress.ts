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
      notice: transition.notice == null ? null : asString(transition.notice),
    },
  };
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
