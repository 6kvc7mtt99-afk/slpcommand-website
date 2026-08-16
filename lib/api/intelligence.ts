import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ReadinessCard = {
  readiness: number;
  label: string;
  milestone: string;
  activeLevel: string;
  totalAttempts: number;
  status: string;
  scoreBars: Array<{ label: string; value: number }>;
};

export type MissionItem = {
  title: string;
  description: string;
  academyFocus: string;
  difficulty: string;
  reason: string;
  targetSkill: string;
};

export type WeaknessItem = {
  key: string;
  label: string;
  accuracy: number | null;
  attempts: number;
  severity: string;
  trend: string;
  academyFocus: string;
  reportable: boolean;
};

export function decodeReadiness(raw: unknown): ReadinessCard {
  const rec = isRecord(raw) ? raw : {};
  const bars = Array.isArray(rec.scoreBars) ? rec.scoreBars : [];
  return {
    readiness: asNumber(pickAlias(rec, "readiness", "score"), 0),
    label: asString(rec.label, "Building foundation"),
    milestone: asString(rec.milestone),
    activeLevel: asString(pickAlias(rec, "activeLevel", "targetLevel")),
    totalAttempts: asNumber(rec.totalAttempts, 0),
    status: asString(rec.status),
    scoreBars: bars.filter(isRecord).map((bar) => ({
      label: asString(bar.label),
      value: asNumber(bar.value, 0),
    })),
  };
}

export function decodeMissions(raw: unknown): MissionItem[] {
  const rec = isRecord(raw) ? raw : {};
  const list = Array.isArray(raw) ? raw : rec.missions || rec.items || rec.data;
  if (!Array.isArray(list)) return [];
  return list.filter(isRecord).map((item) => ({
    title: asString(item.title),
    description: asString(item.description),
    academyFocus: asString(item.academyFocus),
    difficulty: asString(item.difficulty),
    reason: asString(item.reason),
    targetSkill: asString(pickAlias(item, "targetSkill", "key")),
  }));
}

export function decodeWeaknesses(raw: unknown): WeaknessItem[] {
  const rec = isRecord(raw) ? raw : {};
  const list = Array.isArray(raw)
    ? raw
    : rec.weaknessProfile || rec.subSkillProfile || rec.items || rec.weaknesses || rec.data;
  if (!Array.isArray(list)) return [];
  return list.filter(isRecord).map((item) => ({
    key: asString(pickAlias(item, "key", "weakness")),
    label: asString(pickAlias(item, "label", "weakness")),
    accuracy: typeof item.accuracy === "number" ? item.accuracy : null,
    attempts: asNumber(item.attempts, 0),
    severity: asString(item.severity),
    trend: asString(item.trend),
    academyFocus: asString(item.academyFocus),
    reportable: item.reportable === true,
  }));
}
