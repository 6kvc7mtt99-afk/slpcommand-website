import { asNumber, asString, isRecord } from "@/lib/api/decode";

/**
 * The debrief the backend built — reshaped, never recomputed.
 *
 * Every field is the certified engine's own verdict, surfaced by
 * `buildSessionResult` in `lib/coachEvaluation.js`. The browser reads it and
 * renders it. Nothing here is scored, averaged or inferred on the client, and
 * a missing field is rendered as absent rather than filled in.
 */

export type CoachCriterionNote = {
  criterion: string;
  note: string | null;
  /** Verbatim from the learner's own transcript. Never paraphrased. */
  evidence: string | null;
};

export type CoachSessionMetrics = {
  learnerTurnCount: number;
  learnerWordCount: number;
  meanTurnWords: number;
  typeTokenRatio: number;
  fillersPerHundredWords: number;
};

export type CoachSessionResult = {
  workedOn: string;
  ratable: boolean;
  headline: string;
  /** Insufficient evidence is a stated outcome, not a failure. */
  insufficientReason: string | null;
  wentWell: string[];
  keepWorkingOn: string | null;
  strengths: CoachCriterionNote[];
  growthAreas: CoachCriterionNote[];
  functionsPracticed: string[];
  functionsToTry: string[];
  nextObjective: string | null;
  nextRationale: string | null;
  professorNote: string | null;
  metrics: CoachSessionMetrics | null;
};

/** The four assessed criteria, in the engine's own order. */
const CRITERION_LABELS: Record<string, string> = {
  content: "Range of ideas",
  tasks: "Doing the task",
  accuracy: "Accuracy",
  textProduced: "Organising your speech",
};

export function criterionLabel(key: string): string {
  return CRITERION_LABELS[key] ?? key;
}

function decodeStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => asString(item)).filter((item) => item !== "");
}

function decodeNotes(raw: unknown): CoachCriterionNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const criterion = asString(item.criterion);
      if (!criterion) return null;
      return {
        criterion,
        note: asString(item.note) || null,
        evidence: asString(item.evidence) || null,
      };
    })
    .filter((item): item is CoachCriterionNote => item !== null);
}

function decodeMetrics(raw: unknown): CoachSessionMetrics | null {
  if (!isRecord(raw)) return null;
  return {
    learnerTurnCount: asNumber(raw.learnerTurnCount ?? raw.learner_turn_count, 0),
    learnerWordCount: asNumber(raw.learnerWordCount ?? raw.learner_word_count, 0),
    meanTurnWords: asNumber(raw.meanTurnWords ?? raw.mean_turn_words, 0),
    typeTokenRatio: asNumber(raw.typeTokenRatio ?? raw.type_token_ratio, 0),
    fillersPerHundredWords: asNumber(raw.fillersPerHundredWords ?? raw.fillers_per_hundred_words, 0),
  };
}

export function decodeCoachSessionResult(raw: unknown): CoachSessionResult | null {
  if (!isRecord(raw)) return null;
  const workedOn = asString(raw.workedOn || raw.worked_on);
  const headline = asString(raw.headline);
  // Neither alone is enough to call this a debrief; an envelope with no
  // objective and no headline is a shape, not a result.
  if (!workedOn && !headline) return null;
  return {
    workedOn,
    ratable: raw.ratable === true,
    headline,
    insufficientReason: asString(raw.insufficientReason || raw.insufficient_reason) || null,
    wentWell: decodeStrings(raw.wentWell ?? raw.went_well),
    keepWorkingOn: asString(raw.keepWorkingOn || raw.keep_working_on) || null,
    strengths: decodeNotes(raw.strengths),
    growthAreas: decodeNotes(raw.growthAreas ?? raw.growth_areas),
    functionsPracticed: decodeStrings(raw.functionsPracticed ?? raw.functions_practiced),
    functionsToTry: decodeStrings(raw.functionsToTry ?? raw.functions_to_try),
    nextObjective: asString(raw.nextObjective || raw.next_objective) || null,
    nextRationale: asString(raw.nextRationale || raw.next_rationale) || null,
    professorNote: asString(raw.professorNote || raw.professor_note) || null,
    metrics: decodeMetrics(raw.metrics),
  };
}
