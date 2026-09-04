import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ReadinessCard = {
  /** null when the backend sent no readiness — never render this as 0. */
  readiness: number | null;
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

/**
 * Accuracy, normalised ONCE, here.
 *
 * The weakness endpoints send accuracy either as a 0–1 ratio or as an
 * already-scaled percentage. Three consumers each remembered that
 * differently: `IntelligencePanel.percentFromAccuracy` scaled it, the Mastery
 * page scaled it with a comment saying so — and `Briefing` printed
 * `Math.round(item.accuracy)` raw, so a learner at 42% was told they were
 * "0% accurate". Normalising in the decoder means no component has to
 * remember the rule, and none of them can disagree about it again.
 *
 * The 0/1 edge is genuinely ambiguous (is 1 a perfect ratio or one percent?);
 * a perfect ratio is the vastly more likely reading for an accuracy field, and
 * it is the reading the two correct consumers already used.
 */
export function accuracyPercent(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const n = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * INTELLIGENCE-TRUTH — an unmeasured readiness is not a readiness of zero.
 *
 * Two defaults in this decoder manufactured a proficiency assessment out of
 * missing data:
 *
 *  - `readiness` defaulted to `0`. `ReadinessGauge` has no null branch, so a
 *    payload without the field drew a full instrument face reading "0" with
 *    `aria-label="Readiness 0 out of 100"`. Zero readiness and unknown
 *    readiness rendered identically, and zero is by far the more damaging
 *    reading — on a page whose own lead promises "Where the evidence is thin,
 *    this says so instead of guessing".
 *  - `label` defaulted to `"Building foundation"`. The per-skill pages only
 *    short-circuit on `status >= 500`, so a 401/403/404 fell through to
 *    `decodeReadiness(null)` and the learner was shown that phrase as an
 *    `<h1>` above "Everything below is measured from work you submitted" — a
 *    positive-sounding assessment made entirely out of a permission error.
 *
 * `readiness` is now nullable and the label defaults to empty, so Briefing's
 * existing `card.label || …` fallback can do its job.
 */
export function decodeReadiness(raw: unknown): ReadinessCard {
  const rec = isRecord(raw) ? raw : {};
  const bars = Array.isArray(rec.scoreBars) ? rec.scoreBars : [];
  const readinessRaw = pickAlias(rec, "readiness", "score");
  return {
    readiness: readinessRaw == null ? null : asNumber(readinessRaw, 0),
    label: asString(rec.label),
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
    accuracy: accuracyPercent(item.accuracy),
    attempts: asNumber(item.attempts, 0),
    severity: asString(item.severity),
    trend: asString(item.trend),
    academyFocus: asString(item.academyFocus),
    reportable: item.reportable === true,
  }));
}
